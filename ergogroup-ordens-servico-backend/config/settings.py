from pathlib import Path
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

DJANGO_ENV = os.getenv('DJANGO_ENV', 'dev')
load_dotenv(BASE_DIR / f'.env.{DJANGO_ENV}')

SECRET_KEY = os.getenv('SECRET_KEY')

DEBUG = os.getenv('DEBUG', 'True') == 'True'

if DEBUG:
    ALLOWED_HOSTS = ['127.0.0.1', 'localhost']
else:
    ALLOWED_HOSTS = ['api-os.sstsuite.com.br']

CORS_ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "https://os.sstsuite.com.br"
]

FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:8080' if DEBUG else 'https://os.sstsuite.com.br')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'apps.contas',
    'apps.organizacoes',
    'apps.clientes',
    'apps.catalogo',
    'apps.ordens_servico',
    'apps.analise',
    'apps.auditoria',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'drf_spectacular',
    'corsheaders',
]

AUTH_USER_MODEL = 'contas.Usuario'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.auditoria.middleware.AuditoriaContextMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '3306'),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'pt-br'
USE_L10N = True

TIME_ZONE = 'America/Sao_Paulo'

USE_I18N = True

USE_TZ = True

STATIC_URL = '/static/'

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'config', 'static')
]

STATIC_ROOT = os.path.join(BASE_DIR, 'static')

MEDIA_URL = '/media/'

MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

LOGIN_URL = 'login'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'nao-responder@ergogroupapp.com')
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.hostinger.com')
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))

# Interruptor global das notificações por e-mail (tarefa, cobrança).
# Desligar aqui não afeta o resto da aplicação — os signals continuam
# rodando, só o envio de fato é pulado. Ver apps/ordens_servico/emails.py.
EMAIL_NOTIFICATIONS_ENABLED = os.getenv('EMAIL_NOTIFICATIONS_ENABLED', 'True') == 'True'

# Dias sem movimentação para um serviço aberto entrar em alerta (ADR 0008, 3).
DIAS_ALERTA_SEM_MOVIMENTACAO = int(os.getenv('DIAS_ALERTA_SEM_MOVIMENTACAO', '7'))

# Dias de uma OS liberada sem lançamento para entrar em alerta no financeiro (ADR 0008, 9; proposta: 3).
DIAS_ALERTA_SEM_LANCAMENTO = int(os.getenv('DIAS_ALERTA_SEM_LANCAMENTO', '3'))

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.BasicAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'config.exceptions.exception_handler',
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'ErgoApp API',
    'DESCRIPTION': 'Documentação completa das APIs do sistema ErgoApp',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    # Por padrão o drf-spectacular libera schema/Swagger/Redoc com AllowAny,
    # ignorando o IsAuthenticated global do projeto (REST_FRAMEWORK acima).
    # Fixamos Basic Auth aqui (em vez de herdar JWT/sessão do DEFAULT_AUTHENTICATION_CLASSES)
    # pra garantir que o navegador mostre a caixa nativa de usuário/senha ao abrir a
    # documentação — com JWT primeiro na lista, o WWW-Authenticate vira "Bearer" e o
    # navegador não abre prompt nenhum.
    'SERVE_PERMISSIONS': ['rest_framework.permissions.IsAuthenticated'],
    'SERVE_AUTHENTICATION': ['rest_framework.authentication.BasicAuthentication'],
    'ENUM_NAME_OVERRIDES': {
        'StatusOSETarefaEnum': 'apps.ordens_servico.models.ordem_servico.Status',
        'StatusServicoEnum':   'apps.ordens_servico.models.servico.StatusServico',
        'StatusMiniOSEnum':    'apps.ordens_servico.models.ordem_servico_operacional.StatusOrdemServicoOperacional',
        'MotivoCienciaEnum':   'apps.ordens_servico.models.servico.MotivoCiencia',
    },
}
