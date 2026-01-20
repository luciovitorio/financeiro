'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [useInvite, setUseInvite] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          password,
          workspaceName: !useInvite ? workspaceName : undefined,
          inviteCode: useInvite ? inviteCode : undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao criar conta')
        return
      }

      // Auto login after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        setError('Conta criada, mas erro ao fazer login')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setError('Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-8">
            <div className="p-3 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl shadow-lg shadow-primary-200">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent mb-2">
            Crie sua conta
          </h2>
          <CardDescription className="text-gray-600">
            Comece a gerenciar suas finanças hoje
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="transition-all focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="transition-all focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="transition-all focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-gray-600" />
                <Label className="text-sm font-medium">Workspace</Label>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <Button
                  type="button"
                  variant={!useInvite ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseInvite(false)}
                  className="flex-1"
                >
                  Criar Novo
                </Button>
                <Button
                  type="button"
                  variant={useInvite ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseInvite(true)}
                  className="flex-1"
                >
                  Usar Convite
                </Button>
              </div>

              {!useInvite ? (
                <div className="space-y-2">
                  <Label htmlFor="workspaceName" className="text-sm text-gray-600">
                    Nome do Workspace (ex: Finanças da Família)
                  </Label>
                  <Input
                    id="workspaceName"
                    placeholder="Nome do workspace"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="inviteCode" className="text-sm text-gray-600">
                    Código de Convite
                  </Label>
                  <Input
                    id="inviteCode"
                    placeholder="Cole o código aqui"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required={useInvite}
                    className="transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-11 bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all font-medium text-base"
              disabled={loading}
            >
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-center text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline">
                Faça login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
