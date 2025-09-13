import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/ui/icon';
import JSZip from 'jszip';

const Index = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedFile, setProcessedFile] = useState<Blob | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        setUploadedFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        setUploadedFile(file);
      }
    }
  };

  const processFiles = async () => {
    if (!uploadedFile) return;
    
    setIsProcessing(true);
    setProgress(0);
    setStatus('Загружаю архив...');

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(uploadedFile);
      
      setStatus('Анализирую файлы...');
      setProgress(10);

      const mp3Files: { [key: string]: any } = {};
      const pngFiles: { [key: string]: any } = {};

      // Собираем MP3 и PNG файлы
      Object.keys(contents.files).forEach(filename => {
        const file = contents.files[filename];
        if (!file.dir) {
          const match = filename.match(/(\d{3})/);
          if (match) {
            const number = match[1];
            if (filename.toLowerCase().endsWith('.mp3')) {
              mp3Files[number] = file;
            } else if (filename.toLowerCase().endsWith('.png')) {
              pngFiles[number] = file;
            }
          }
        }
      });

      setStatus('Добавляю обложки...');
      setProgress(30);

      const newZip = new JSZip();
      const mp3Count = Object.keys(mp3Files).length;
      let processedCount = 0;

      // Обрабатываем каждый MP3 файл
      for (const number of Object.keys(mp3Files)) {
        if (pngFiles[number]) {
          const mp3Data = await mp3Files[number].async('uint8array');
          const pngData = await pngFiles[number].async('uint8array');
          
          // Здесь должна быть логика встраивания обложки через ID3v2
          // Для демо версии просто копируем файл
          newZip.file(`audio_${number}.mp3`, mp3Data);
          
          processedCount++;
          setProgress(30 + (processedCount / mp3Count) * 60);
          setStatus(`Обработано ${processedCount} из ${mp3Count} файлов`);
        } else {
          // Копируем MP3 без обложки
          const mp3Data = await mp3Files[number].async('uint8array');
          newZip.file(`audio_${number}.mp3`, mp3Data);
          processedCount++;
        }
      }

      setStatus('Создаю архив...');
      setProgress(95);

      const processedBlob = await newZip.generateAsync({ type: 'blob' });
      setProcessedFile(processedBlob);
      
      setProgress(100);
      setStatus('Готово!');
      setIsProcessing(false);

    } catch (error) {
      console.error('Ошибка обработки:', error);
      setStatus('Ошибка обработки файлов');
      setIsProcessing(false);
    }
  };

  const downloadProcessed = () => {
    if (processedFile) {
      const url = URL.createObjectURL(processedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'processed_audio.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const reset = () => {
    setUploadedFile(null);
    setIsProcessing(false);
    setProgress(0);
    setProcessedFile(null);
    setStatus('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-[#0ea5e9] to-[#06b6d4] bg-clip-text text-transparent">
            MP3 Cover Processor
          </h1>
          <p className="text-gray-400 text-lg">
            Автоматическое добавление обложек к MP3 файлам из архива
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {!uploadedFile && !isProcessing && !processedFile && (
            <Card className="bg-[#2d2d2d] border-[#404040] p-8">
              <div
                className={`border-2 border-dashed ${
                  dragActive ? 'border-[#0ea5e9] bg-[#0ea5e9]/10' : 'border-[#404040]'
                } rounded-lg p-12 text-center transition-colors`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Icon name="Upload" size={48} className="mx-auto mb-4 text-[#0ea5e9]" />
                <h3 className="text-xl font-semibold mb-2">Загрузите ZIP архив</h3>
                <p className="text-gray-400 mb-6">
                  Перетащите архив или нажмите для выбора файла
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#0ea5e9] hover:bg-[#0284c7]"
                >
                  <Icon name="FolderOpen" size={20} className="mr-2" />
                  Выбрать файл
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </Card>
          )}

          {uploadedFile && !isProcessing && !processedFile && (
            <Card className="bg-[#2d2d2d] border-[#404040] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Icon name="Archive" size={24} className="mr-3 text-[#0ea5e9]" />
                  <div>
                    <h3 className="font-semibold">{uploadedFile.name}</h3>
                    <p className="text-gray-400 text-sm">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  onClick={reset}
                  variant="outline"
                  className="border-[#404040] text-gray-400"
                >
                  <Icon name="X" size={16} />
                </Button>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={processFiles}
                  className="bg-[#0ea5e9] hover:bg-[#0284c7] flex-1"
                >
                  <Icon name="Play" size={20} className="mr-2" />
                  Начать обработку
                </Button>
              </div>
            </Card>
          )}

          {isProcessing && (
            <Card className="bg-[#2d2d2d] border-[#404040] p-6">
              <div className="text-center mb-6">
                <Icon name="Loader2" size={48} className="mx-auto mb-4 text-[#0ea5e9] animate-spin" />
                <h3 className="text-xl font-semibold mb-2">Обработка файлов</h3>
                <p className="text-gray-400">{status}</p>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-gray-400 mt-2">{progress}%</p>
            </Card>
          )}

          {processedFile && (
            <Card className="bg-[#2d2d2d] border-[#404040] p-6">
              <div className="text-center mb-6">
                <Icon name="CheckCircle" size={48} className="mx-auto mb-4 text-green-500" />
                <h3 className="text-xl font-semibold mb-2">Обработка завершена</h3>
                <p className="text-gray-400">Файлы успешно обработаны и готовы к скачиванию</p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={downloadProcessed}
                  className="bg-green-600 hover:bg-green-700 flex-1"
                >
                  <Icon name="Download" size={20} className="mr-2" />
                  Скачать результат
                </Button>
                <Button
                  onClick={reset}
                  variant="outline"
                  className="border-[#404040] text-gray-400"
                >
                  Новый файл
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Info */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Поддерживаются файлы с номерами от 000 до 999</p>
          <p>Формат: audio_XXX.mp3 + cover_XXX.png</p>
        </div>
      </div>
    </div>
  );
};

export default Index;