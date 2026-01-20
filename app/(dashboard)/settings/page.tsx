'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Palette, CreditCard, LayoutDashboard, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

const THEMES = [
  { name: 'Clássico (Marrom)', primary: '#4d403a', 
    palette: {
      50: '#f8f7f7', 100: '#efeceb', 200: '#dcd6d4', 300: '#c0b4b0', 
      400: '#a3908a', 500: '#86716a', 600: '#4d403a', 700: '#3f3430', 
      800: '#352c28', 900: '#2c2522'
    } 
  },
  { name: 'Esmeralda (Verde)', primary: '#059669', 
    palette: {
      50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 
      400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 
      800: '#065f46', 900: '#064e3b'
    } 
  },
  { name: 'Oceano (Azul)', primary: '#2563eb', 
    palette: {
      50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 
      400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 
      800: '#1e40af', 900: '#1e3a8a'
    } 
  },
  { name: 'Ametista (Roxo)', primary: '#7c3aed', 
    palette: {
      50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 
      400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 
      800: '#5b21b6', 900: '#4c1d95'
    } 
  },
  { name: 'Sunset (Laranja)', primary: '#ea580c', 
    palette: {
      50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 
      400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 
      800: '#9a3412', 900: '#7c2d12'
    } 
  },
]

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession()
  const [activeTheme, setActiveTheme] = useState(THEMES[0])
  
  // Profile State
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [isProfileSaving, setIsProfileSaving] = useState(false)

  // Workspace State
  const [workspaceName, setWorkspaceName] = useState('')
  const [isWorkspaceSaving, setIsWorkspaceSaving] = useState(false)

  useEffect(() => {
    // Load saved theme
    const savedPrimary = localStorage.getItem('theme-primary')
    const theme = THEMES.find(t => t.primary === savedPrimary)
    if (theme) setActiveTheme(theme)
      
    // Load session data
    if (session?.user) {
      setUserName(session.user.name || '')
      setUserEmail(session.user.email || '')
      setWorkspaceName((session.user as any).workspaceName || '')
    }
  }, [session])

  const applyTheme = (theme: typeof THEMES[0]) => {
    setActiveTheme(theme)
    
    // Set variables
    const root = document.documentElement
    root.style.setProperty('--primary', theme.primary)
    
    // Set palette vars
    Object.entries(theme.palette).forEach(([key, value]) => {
      root.style.setProperty(`--color-primary-${key}`, value)
    })
    
    // Save to storage
    localStorage.setItem('theme-primary', theme.primary)
    toast.success(`Tema ${theme.name} aplicado com sucesso!`)
  }

  const handleUpdateProfile = async () => {
    setIsProfileSaving(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName })
      })
      
      if (!res.ok) throw new Error()
      
      await updateSession({ name: userName })
      toast.success('Perfil atualizado com sucesso!')
    } catch (error) {
      toast.error('Erro ao atualizar perfil')
    } finally {
      setIsProfileSaving(false)
    }
  }

  const handleUpdateWorkspace = async () => {
    setIsWorkspaceSaving(true)
    try {
      const res = await fetch('/api/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName })
      })
      
      if (!res.ok) throw new Error()
      
      await updateSession({ workspaceName })
      toast.success('Espaço de trabalho atualizado com sucesso!')
    } catch (error) {
      toast.error('Erro ao atualizar espaço de trabalho')
    } finally {
      setIsWorkspaceSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e configurações da conta
        </p>
      </div>

      <Tabs defaultValue="appearance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="workspace" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Espaço de Trabalho
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Tema do Sistema</CardTitle>
              <CardDescription>
                Escolha a cor de destaque que reflete seu estilo
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {THEMES.map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() => applyTheme(theme)}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                      ${activeTheme.primary === theme.primary 
                        ? 'border-primary bg-primary/5' 
                        : 'border-transparent hover:bg-gray-100'}
                    `}
                  >
                    <div 
                      className="w-12 h-12 rounded-full shadow-sm" 
                      style={{ backgroundColor: theme.primary }}
                    />
                    <span className="text-sm font-medium text-center">{theme.name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Perfil de Usuário</CardTitle>
              <CardDescription>Atualize suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input 
                  value={userName} 
                  onChange={(e) => setUserName(e.target.value)} 
                  placeholder="Seu nome" 
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={userEmail} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
              </div>
              <Button onClick={handleUpdateProfile} disabled={isProfileSaving}>
                {isProfileSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workspace">
          <Card>
            <CardHeader>
              <CardTitle>Espaço de Trabalho</CardTitle>
              <CardDescription>Gerencie as configurações do seu espaço compartilhado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Espaço</Label>
                <Input 
                  value={workspaceName} 
                  onChange={(e) => setWorkspaceName(e.target.value)} 
                  placeholder="Ex: Minha Casa, Finanças Pessoais" 
                />
              </div>
              <Button onClick={handleUpdateWorkspace} disabled={isWorkspaceSaving}>
                {isWorkspaceSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
