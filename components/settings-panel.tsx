interface ConversionSettings {
  preserveFormatting: boolean
  includeImages: boolean
  autoSave: boolean
  outputDirectory?: string
}

interface SettingsPanelProps {
  settings: ConversionSettings
  onSettingsChange: (settings: ConversionSettings) => void
}

export const SettingsPanel = ({
  settings,
  onSettingsChange
}: SettingsPanelProps) => {
  const handleToggle = (key: keyof ConversionSettings) => {
    onSettingsChange({
      ...settings,
      [key]: !settings[key]
    })
  }

  const handleDirectoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      ...settings,
      outputDirectory: e.target.value
    })
  }

  return (
    <div className="w-full space-y-4 p-4 bg-white rounded-md border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">
        Conversion Settings
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label 
            htmlFor="preserve-formatting"
            className="text-sm font-medium text-gray-700"
          >
            Preserve Formatting
          </label>
          <button
            id="preserve-formatting"
            role="switch"
            aria-checked={settings.preserveFormatting}
            onClick={() => handleToggle('preserveFormatting')}
            className={`${
              settings.preserveFormatting ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            <span
              className={`${
                settings.preserveFormatting ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label 
            htmlFor="include-images"
            className="text-sm font-medium text-gray-700"
          >
            Include Images
          </label>
          <button
            id="include-images"
            role="switch"
            aria-checked={settings.includeImages}
            onClick={() => handleToggle('includeImages')}
            className={`${
              settings.includeImages ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            <span
              className={`${
                settings.includeImages ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label 
            htmlFor="auto-save"
            className="text-sm font-medium text-gray-700"
          >
            Auto Save
          </label>
          <button
            id="auto-save"
            role="switch"
            aria-checked={settings.autoSave}
            onClick={() => handleToggle('autoSave')}
            className={`${
              settings.autoSave ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            <span
              className={`${
                settings.autoSave ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </button>
        </div>

        <div className="space-y-2">
          <label 
            htmlFor="output-directory"
            className="block text-sm font-medium text-gray-700"
          >
            Output Directory
          </label>
          <input
            id="output-directory"
            type="text"
            value={settings.outputDirectory || ''}
            onChange={handleDirectoryChange}
            placeholder="Enter output directory path"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  )
}
