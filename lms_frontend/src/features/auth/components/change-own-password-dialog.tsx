import * as React from 'react'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/session/auth/auth-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getApiErrorContent } from '@/utils/error-handler'

interface ChangeOwnPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ChangeOwnPasswordDialog: React.FC<ChangeOwnPasswordDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { changeOwnPassword } = useAuth()
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [error, setError] = React.useState<string>()
  const [isSaving, setIsSaving] = React.useState(false)

  const resetForm = React.useCallback(() => {
    setCurrentPassword('')
    setPassword('')
    setConfirmPassword('')
    setError(undefined)
    setIsSaving(false)
  }, [])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  const validate = () => {
    if (!currentPassword) return '请输入当前密码'
    if (password.length < 6) return '新密码至少 6 位'
    if (password !== confirmPassword) return '两次输入的新密码不一致'
    if (currentPassword === password) return '新密码不能和当前密码相同'
    return undefined
  }

  const submit = async () => {
    const nextError = validate()
    if (nextError) {
      setError(nextError)
      return
    }

    setIsSaving(true)
    try {
      await changeOwnPassword({
        current_password: currentPassword,
        password,
      })
      toast.success('密码已修改')
      handleOpenChange(false)
    } catch (err) {
      const { title, description } = getApiErrorContent(err, '密码修改失败')
      toast.error(title, { description })
    } finally {
      setIsSaving(false)
    }
  }

  const clearError = () => setError(undefined)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[380px] rounded-xl border border-border p-6" showClose={!isSaving}>
        <DialogHeader className="text-left">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
            <KeyRound className="h-5 w-5" />
          </div>
          <DialogTitle className="text-[18px] font-semibold text-foreground">修改密码</DialogTitle>
          <DialogDescription className="text-[13px] text-text-muted">
            修改后会刷新当前登录状态
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            type="password"
            value={currentPassword}
            autoFocus
            disabled={isSaving}
            placeholder="当前密码"
            onChange={(event) => {
              setCurrentPassword(event.target.value)
              clearError()
            }}
          />
          <Input
            type="password"
            value={password}
            disabled={isSaving}
            placeholder="新密码"
            onChange={(event) => {
              setPassword(event.target.value)
              clearError()
            }}
          />
          <Input
            type="password"
            value={confirmPassword}
            disabled={isSaving}
            placeholder="确认新密码"
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              clearError()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void submit()
              }
            }}
          />
          {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            取消
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={isSaving}>
            {isSaving ? '保存中' : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
