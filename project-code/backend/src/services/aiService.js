import axios from "axios";
import FormData from "form-data";

export async function extractReceiptFromAI(
  fileBuffer,
  originalName,
  mimeType,
  aiServiceUrl,
) {
  const formData = new FormData();
  formData.append("file", fileBuffer, {
    filename: originalName,
    contentType: mimeType,
  });

  const response = await axios.post(`${aiServiceUrl}/extract`, formData, {
    headers: formData.getHeaders(),
    maxBodyLength: Infinity,
    timeout: 60_000,
  });

  return response.data;
}
