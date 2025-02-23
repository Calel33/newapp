interface FilePreviewProps {
  content: string
  fileName: string
  onSave?: () => void
  onCopy?: () => void
}

export const FilePreview = ({
  content,
  fileName,
  onSave,
  onCopy
}: FilePreviewProps) => {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          {fileName}
        </h3>
        <div className="space-x-2">
          {onCopy && (
            <button
              onClick={onCopy}
              className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              aria-label="Copy content"
            >
              Copy
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Save file"
            >
              Save
            </button>
          )}
        </div>
      </div>
      <div className="w-full h-96 overflow-auto">
        <pre className="p-4 bg-gray-50 rounded-md border border-gray-200 text-sm text-gray-800">
          {content}
        </pre>
      </div>
    </div>
  )
}
