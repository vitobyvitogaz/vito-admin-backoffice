import { getAuthToken } from '@/lib/auth';

export const uploadProductImage = async (file: File): Promise<string> => {
  const token = getAuthToken();

  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erreur lors de l\'upload');
  }

  const data = await response.json();
  return data.file_url;
};