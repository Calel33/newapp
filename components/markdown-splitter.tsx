import { useState, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import { splitMarkdownByHeaders } from '../lib/markdown-utils';
import { FileUpload } from './ui/file-upload';
import JSZip from 'jszip';

export default function MarkdownSplitter({ clearFiles }: { clearFiles: () => void }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [splitFiles, setSplitFiles] = useState<{ name: string; content: string }[]>([]);
  
  useEffect(() => {
    return () => {
      // Cleanup URLs when component unmounts
      splitFiles.forEach((_, index) => {
        const url = document.querySelector(`a[data-split-file="${index}"]`)?.getAttribute('href');
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [splitFiles]);
  
  const handleClear = useCallback(() => {
    setFile(null);
    setSplitFiles([]);
    clearFiles();
  }, [clearFiles]);
  
  const handleFileUpload = useCallback(async (uploadedFiles: File[]) => {
    const uploadedFile = uploadedFiles[0];
    if (!uploadedFile) return;
  
    try {
      const content = await uploadedFile.text();
      const splitResults = splitMarkdownByHeaders(content);
      setSplitFiles(splitResults);
      setFile(uploadedFile);
      toast({
        title: 'File uploaded successfully',
        description: `${uploadedFile.name} has been processed`,
      });
    } catch (error) {
      toast({
        title: 'Error processing file',
        description: 'Failed to read or split the markdown file',
        variant: 'destructive',
      });
    }
  }, [toast]);
  
  const handleDownload = useCallback((content: string, splitFile: { name: string }, index: number) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('data-split-file', index.toString());
    const safeName = splitFile.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeName}-part-${index + 1}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);
  
  const handleDownloadAll = useCallback(async () => {
    if (!splitFiles.length) return;
  
    const zip = new JSZip();
    splitFiles.forEach((splitFile, index) => {
      const safeName = splitFile.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      zip.file(`${safeName}-part-${index + 1}.md`, splitFile.content);
    });
  
    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'split-files.zip';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Error creating zip file',
        description: 'Failed to create or download the zip archive',
        variant: 'destructive',
      });
    }
  }, [splitFiles, toast]);
  
  return (
    <div className="space-y-8 p-6 bg-white rounded-lg shadow-sm border">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-semibold tracking-tight">Split Files</h3>
          {file && (
            <button
              className="text-sm px-2 py-1 text-red-500 hover:text-red-700 transition-colors"
              onClick={handleClear}
              aria-label="Clear files"
            >
              Clear
            </button>
          )}
        </div>
  
        {file && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-gray-50 p-2 rounded">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>
              {file.name} ({Math.round(file.size / 1024)}KB)
            </span>
          </div>
        )}
        <div className="mt-4">
          <FileUpload onChange={handleFileUpload} clear={clearFiles} />
        </div>
        
        {splitFiles.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Split Files ({splitFiles.length})</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAll}
                className="flex items-center space-x-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>Download All</span>
              </Button>
            </div>
            
            <div className="grid gap-3">
              {splitFiles.map((splitFile, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="truncate text-sm">{splitFile.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(splitFile.content, splitFile, index)}
                    className="ml-4"
                  >
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}