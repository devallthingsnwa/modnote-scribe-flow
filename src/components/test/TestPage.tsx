
import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TranscriptionTester } from './TranscriptionTester';

export function TestPage() {
  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Transcription System Test</h1>
            <p className="text-muted-foreground mt-2">
              Test the multimedia import and transcription functionality with real URLs
            </p>
          </div>
          
          <TranscriptionTester />
        </div>
      </div>
    </div>
  );
}
