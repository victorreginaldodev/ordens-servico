import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { ChevronsUpDown, LogOut, Moon, Sun, SunMoon, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { authService } from '@/services/auth';
import { cn } from '@/lib/utils';

/** Único lugar do usuário no app: rodapé da sidebar. Perfil, tema e sair. */
export function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { displayName, email, initials, roleLabel, photo } = useCurrentUser();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => setMounted(true), []);

  const logout = async () => {
    await authService.logout();
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  const trigger = (
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted',
          collapsed && 'justify-center',
        )}
      >
        <span className="relative shrink-0">
          <Avatar className="size-8">
            {photo ? <AvatarImage src={photo} alt="" /> : null}
            <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary dark:bg-primary/25 dark:text-foreground">{initials}</AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-canvas bg-success" aria-hidden />
        </span>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-semibold">{displayName}</span>
              <span className="block truncate text-xs text-muted-foreground">{roleLabel}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </>
        ) : null}
      </button>
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right">{displayName}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent side={collapsed ? 'right' : 'top'} align={collapsed ? 'end' : 'start'} className="w-64">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-semibold">{displayName}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {email}
            {email && roleLabel ? ' · ' : ''}
            {roleLabel}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/time/eu">
            <User className="mr-2 size-4" />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <div className="flex h-9 items-center px-2 text-sm">
          <SunMoon className="mr-2 size-4" aria-hidden />
          Tema
          {mounted ? (
            <div className="ml-auto flex gap-0.5 rounded-md bg-muted p-0.5" role="radiogroup" aria-label="Tema">
              {[
                { value: 'light', icon: Sun, label: 'Claro' },
                { value: 'dark', icon: Moon, label: 'Escuro' },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={resolvedTheme === t.value}
                  aria-label={t.label}
                  title={t.label}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    'grid h-6 w-7 place-items-center rounded text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    resolvedTheme === t.value && 'bg-card text-foreground shadow-sm',
                  )}
                >
                  <t.icon className="size-3.5" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout} className="text-danger-strong focus:text-danger-strong">
          <LogOut className="mr-2 size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
