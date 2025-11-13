import { ChangeEvent } from 'react';
import api from '../api/client';

interface UploadProps {
  folder: string;
  onUploaded: (url: string) => void;
}

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Uploader = ({ folder, onUploaded }: UploadProps) => {
  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    const { data } = await api.post('/storage/upload', {
      base64,
      folder,
      fileName: file.name
    });
    onUploaded(data.url);
  };

  return <input type="file" accept="image/*" onChange={handleChange} />;
};

export default Uploader;
