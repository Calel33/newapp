interface ConversionStatusProps {
  status: 'idle' | 'converting' | 'success' | 'error'
  message?: string
  progress?: number
}

export const ConversionStatus = ({ 
  status, 
  message = '', 
  progress = 0 
}: ConversionStatusProps) => {
  const statusColors = {
    idle: 'bg-gray-100 text-gray-600',
    converting: 'bg-blue-100 text-blue-600',
    success: 'bg-green-100 text-green-600',
    error: 'bg-red-100 text-red-600'
  }

  const statusMessages = {
    idle: 'Ready to convert',
    converting: 'Converting documentation...',
    success: 'Conversion completed',
    error: 'Error occurred during conversion'
  }

  return (
    <div className="w-full space-y-2">
      <div className={`p-4 rounded-md ${statusColors[status]}`}>
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {statusMessages[status]}
          </span>
          {status === 'converting' && (
            <span className="text-sm">
              {progress}%
            </span>
          )}
        </div>
        {message && (
          <p className="mt-2 text-sm">
            {message}
          </p>
        )}
        {status === 'converting' && (
          <div className="mt-2 w-full h-2 bg-blue-200 rounded-full">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
