import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Camera, Loader2, ShieldAlert } from 'lucide-react';
import { identifyPlant } from '../services/aiservise';
import PlantResult from './PlantResult';

const createHistoryImage = (file) =>
  new Promise((resolve) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      image.onload = () => {
        const maxSize = 720;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };

      image.onerror = () => resolve(reader.result);
      image.src = reader.result;
    };

    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

export default function Scanner({ onScanComplete }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setResult(null);
    setScanError('');
    setIsScanning(true);
    const historyImage = await createHistoryImage(file);

    try {
      const response = await identifyPlant(file);
      if (response.success) {
        setResult(response);
        onScanComplete?.({
          id: `${Date.now()}-${response.plantData.id}`,
          scannedAt: new Date().toISOString(),
          confidenceScore: response.confidenceScore,
          imagePreview: historyImage,
          plantData: response.plantData,
        });
      } else {
        setScanError(response.message || 'No verified match found.');
      }
    } catch (error) {
      console.error("Identification failed:", error);
      setScanError('Identification failed. Please try another image.');
    } finally {
      setIsScanning(false);
    }
  };

  const resetScanner = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setResult(null);
    setScanError('');
    setIsScanning(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="scanner-shell max-w-2xl mx-auto p-4 space-y-6">
      
      {/* Upload Area */}
      {!imagePreview && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="scanner-dropzone border-2 border-dashed border-emerald-300 rounded-2xl p-12 text-center bg-emerald-50 cursor-pointer hover:bg-emerald-100 transition-colors"
          onClick={() => fileInputRef.current.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
          />
          <UploadCloud className="mx-auto h-12 w-12 text-emerald-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800">Tap to upload or take a photo</h3>
          <p className="text-sm text-gray-500 mt-2">Supports JPG, PNG</p>
          
          <button className="scanner-button mt-6 bg-emerald-600 text-white px-6 py-2 rounded-full font-medium flex items-center justify-center mx-auto space-x-2">
            <Camera className="w-4 h-4" />
            <span>Open Camera</span>
          </button>
        </motion.div>
      )}

      {/* Loading State */}
      {isScanning && (
        <div className="scanner-loading flex flex-col items-center justify-center p-12 space-y-4">
          <div className="relative">
             <img src={imagePreview} alt="Scanning" className="w-48 h-48 object-cover rounded-2xl opacity-50" />
             <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
             </div>
          </div>
          <p className="text-emerald-700 font-medium animate-pulse">Sending image to Plant.id for identification...</p>
        </div>
      )}

      {scanError && !isScanning && (
        <div className="scanner-error flex items-start gap-3 p-4">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <div>
            <h3>Verified match not found</h3>
            <p>{scanError}</p>
            <button type="button" className="secondary-action mt-4" onClick={resetScanner}>
              Try another image
            </button>
          </div>
        </div>
      )}

      {/* Result View */}
      {result && !isScanning && (
        <PlantResult result={result} imagePreview={imagePreview} onReset={resetScanner} />
      )}
    </div>
  );
}
