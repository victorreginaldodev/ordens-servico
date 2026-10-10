from django.test import TestCase
from django.core import mail
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework.test import APIClient
from rest_framework import status

Usuario = get_user_model()


class PasswordResetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = Usuario.objects.create_user(
            email='testuser@sstsuite.com.br',
            username='testuser',
            nome_completo='Test User',
            password='OldPassword@123',
            is_active=True,
        )

    def test_request_password_reset_success(self):
        response = self.client.post('/api/contas/auth/password/reset/', {'email': 'testuser@sstsuite.com.br'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertIn('Redefinição de Senha', email.subject)
        self.assertEqual(email.to, ['testuser@sstsuite.com.br'])
        self.assertIn('/reset-password?token=', email.body)

    def test_request_password_reset_nonexistent_email_does_not_send_mail(self):
        response = self.client.post('/api/contas/auth/password/reset/', {'email': 'naoexiste@sstsuite.com.br'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_confirm_password_reset_success(self):
        uidb64 = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        composite_token = f"{uidb64}.{token}"

        response = self.client.post('/api/contas/auth/password/reset/confirm/', {
            'token': composite_token,
            'new_password': 'NewStrongPassword@2026',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewStrongPassword@2026'))

        # Token não deve poder ser reutilizado
        response_reuse = self.client.post('/api/contas/auth/password/reset/confirm/', {
            'token': composite_token,
            'new_password': 'AnotherPassword@2026',
        })
        self.assertEqual(response_reuse.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_password_reset_invalid_token(self):
        response = self.client.post('/api/contas/auth/password/reset/confirm/', {
            'token': 'invalid.token',
            'new_password': 'NewStrongPassword@2026',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_request_password_reset_with_expired_bearer_header(self):
        # Garante que um Bearer token inválido/expirado enviado no header não quebra a rota pública
        self.client.credentials(HTTP_AUTHORIZATION='Bearer token_invalido_qualquer')
        response = self.client.post('/api/contas/auth/password/reset/', {'email': 'testuser@sstsuite.com.br'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
