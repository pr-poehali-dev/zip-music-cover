import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/ui/icon';
import JSZip from 'jszip';
import * as NodeID3 from 'node-id3';

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
          
          try {
            // Встраиваем обложку через ID3v2 теги
            const mp3Buffer = Buffer.from(mp3Data);
            const pngBuffer = Buffer.from(pngData);
            
            // Создаем ID3v2 теги с обложкой
            const tags = {
              image: {
                mime: 'image/png',
                type: {
                  id: 3,
                  name: 'Front Cover'
                },
                description: 'Album Cover',
                imageBuffer: pngBuffer
              }
            };
            
            // Записываем теги в MP3
            const success = NodeID3.write(tags, mp3Buffer);
            
            if (success) {
              // Сохраняем обработанный файл
              newZip.file(`audio_${number}.mp3`, success);
            } else {
              // Если не удалось встроить обложку, сохраняем исходный файл
              newZip.file(`audio_${number}.mp3`, mp3Data);
            }
          } catch (error) {
            console.error(`Ошибка обработки файла ${number}:`, error);
            // В случае ошибки сохраняем исходный файл
            newZip.file(`audio_${number}.mp3`, mp3Data);
          }
          
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
    <div className="min-h-screen text-white p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl float-animation"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl float-animation" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-full blur-2xl float-animation" style={{animationDelay: '4s'}}></div>
      </div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="relative inline-block mb-6">
            <Icon name="Music" size={64} className="mx-auto text-blue-400 pulse-glow" />
          </div>
          <h1 className="text-5xl font-bold mb-4 gradient-text">
            MP3 Cover Processor
          </h1>
          <p className="text-gray-300 text-xl leading-relaxed max-w-2xl mx-auto">
            Автоматическое добавление обложек к MP3 файлам из архива
          </p>
          <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-400">
            <Icon name="Zap" size={16} className="text-yellow-400" />
            <span>Быстро</span>
            <span>•</span>
            <Icon name="Shield" size={16} className="text-green-400" />
            <span>Безопасно</span>
            <span>•</span>
            <Icon name="Sparkles" size={16} className="text-purple-400" />
            <span>Качественно</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {!uploadedFile && !isProcessing && !processedFile && (
            <Card className="glass-card p-8 transform hover:scale-[1.02] transition-all duration-300">
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-500 ${
                  dragActive 
                    ? 'border-blue-400 bg-gradient-to-br from-blue-500/20 to-purple-500/20 glow-effect scale-105 shimmer' 
                    : 'border-gray-600 hover:border-blue-500/50 hover:bg-gradient-to-br hover:from-blue-500/10 hover:to-purple-500/10'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className={`transition-all duration-300 ${
                  dragActive ? 'transform scale-110' : ''
                }`}>
                  <Icon 
                    name={dragActive ? "FileMusic" : "Upload"} 
                    size={64} 
                    className={`mx-auto mb-6 transition-all duration-300 ${
                      dragActive ? 'text-blue-400 pulse-glow' : 'text-blue-500'
                    }`} 
                  />
                  <h3 className="text-2xl font-bold mb-3 gradient-text">
                    {dragActive ? 'Отпустите файл' : 'Загрузите ZIP архив'}
                  </h3>
                  <p className="text-gray-300 mb-8 text-lg">
                    {dragActive 
                      ? 'Файл будет обработан автоматически'
                      : 'Перетащите архив или нажмите для выбора файла'
                    }
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 glow-effect"
                    size="lg"
                  >
                    <Icon name="FolderOpen" size={20} className="mr-2" />
                    Выбрать файл
                  </Button>
                </div>
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
            <Card className="glass-card p-6 transform hover:scale-[1.01] transition-all duration-300 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                    <Icon name="Archive" size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">{uploadedFile.name}</h3>
                    <p className="text-gray-300">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  onClick={reset}
                  variant="ghost"
                  className="text-gray-400 hover:text-white hover:bg-red-500/20 rounded-xl"
                  size="sm"
                >
                  <Icon name="X" size={18} />
                </Button>
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={processFiles}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 flex-1 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 glow-effect"
                  size="lg"
                >
                  <Icon name="Play" size={20} className="mr-2" />
                  Начать обработку
                </Button>
              </div>
            </Card>
          )}

          {isProcessing && (
            <Card className="glass-card p-8 animate-fade-in">
              <div className="text-center mb-8">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center pulse-glow">
                    <Icon name="Loader2" size={32} className="text-white animate-spin" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 gradient-text">Обработка файлов</h3>
                <p className="text-gray-300 text-lg">{status}</p>
              </div>
              <div className="relative mb-4">
                <Progress value={progress} className="h-3 bg-gray-700" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-20 animate-pulse"></div>
              </div>
              <div className="text-center">
                <span className="text-2xl font-bold gradient-text">{progress}%</span>
                <div className="text-sm text-gray-400 mt-1">Завершено</div>
              </div>
            </Card>
          )}

          {processedFile && (
            <Card className="glass-card p-8 animate-scale-in">
              <div className="text-center mb-8">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center glow-effect">
                    <Icon name="CheckCircle" size={32} className="text-white" />
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full animate-ping"></div>
                </div>
                <h3 className="text-2xl font-bold mb-3 gradient-text">Обработка завершена!</h3>
                <p className="text-gray-300 text-lg">Файлы успешно обработаны и готовы к скачиванию</p>
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={downloadProcessed}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 flex-1 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 glow-effect"
                  size="lg"
                >
                  <Icon name="Download" size={20} className="mr-2" />
                  Скачать результат
                </Button>
                <Button
                  onClick={reset}
                  variant="ghost"
                  className="text-gray-400 hover:text-white hover:bg-gray-600/20 rounded-xl px-6"
                >
                  Новый файл
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Info */}
        <div className="mt-16 text-center">
          <div className="glass-card p-6 rounded-2xl max-w-2xl mx-auto">
            <h4 className="font-semibold text-lg mb-3 gradient-text">Поддерживаемые форматы</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-center space-x-2 text-gray-300">
                <Icon name="FileAudio" size={16} className="text-blue-400" />
                <span>MP3 файлы (000-999)</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-gray-300">
                <Icon name="Image" size={16} className="text-purple-400" />
                <span>PNG обложки (000-999)</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-400">
              Формат: audio_XXX.mp3 + cover_XXX.png
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center mt-16 pb-8">
        <div className="inline-flex items-center space-x-2 text-gray-400 text-sm">
          <span>Made with</span>
          <Icon name="Heart" size={16} className="text-red-500 animate-pulse" />
          <span>for music lovers</span>
        </div>
      </div>
    </div>
  );
};

export default Index;