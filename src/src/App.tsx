import { useState, useEffect } from 'react'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { Switch } from './components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'

declare global {
  interface Window {
    fanculo_ajax: {
      ajax_url: string;
      nonce: string;
    };
  }
}

interface Settings {
  enable_block_studio: boolean;
  blocks_directory: string;
  debug_mode: boolean;
}

function App() {
  const [settings, setSettings] = useState<Settings>({
    enable_block_studio: true,
    blocks_directory: 'gutenberg-blocks',
    debug_mode: false,
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(window.fanculo_ajax.ajax_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'fanculo_save_settings',
          nonce: window.fanculo_ajax.nonce,
          settings: JSON.stringify(settings),
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage('Settings saved successfully!')
      } else {
        setMessage('Error saving settings: ' + result.data)
      }
    } catch (error) {
      setMessage('Error saving settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Fanculo WP Settings</h1>
        <p className="text-muted-foreground">
          Configure your Gutenberg Block Studio settings
        </p>
      </div>

      <h1>Tests</h1>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="blocks">Blocks</TabsTrigger>
          <TabsTrigger value="development">Development</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic configuration options for Fanculo WP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enable_block_studio"
                  checked={settings.enable_block_studio}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({ ...prev, enable_block_studio: checked }))
                  }
                />
                <Label htmlFor="enable_block_studio">Enable Block Studio</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Block Configuration</CardTitle>
              <CardDescription>
                Settings related to Gutenberg blocks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="blocks_directory">Blocks Directory</Label>
                <Input
                  id="blocks_directory"
                  type="text"
                  value={settings.blocks_directory}
                  onChange={(e) =>
                    setSettings(prev => ({ ...prev, blocks_directory: e.target.value }))
                  }
                  placeholder="gutenberg-blocks"
                />
                <p className="text-sm text-muted-foreground">
                  Directory name where blocks will be saved (relative to wp-content/plugins/)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="development" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Development Settings</CardTitle>
              <CardDescription>
                Options for developers and debugging
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="debug_mode"
                  checked={settings.debug_mode}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({ ...prev, debug_mode: checked }))
                  }
                />
                <Label htmlFor="debug_mode">Enable Debug Mode</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center space-x-4">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
        {message && (
          <p className={`text-sm ${message.includes('Error') ? 'text-destructive' : 'text-green-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

export default App