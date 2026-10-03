import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import azureBlobService from '../backend/services/azureBlobService';

vi.mock('axios');

describe('azureBlobService.deleteFile', () => {
  beforeEach(() => {
    vi.mocked(axios.delete).mockReset();
    azureBlobService.useMockMode = false;
  });

  it('calls DELETE /api/file/:fileName with the full blob path as blobName', async () => {
    vi.mocked(axios.delete).mockResolvedValue({ data: { success: true } });
    const blobName = 'CLIENT-1/identification/2026-10-03T22-39-52-723Z-Screenshot 1.png';

    await expect(azureBlobService.deleteFile(blobName)).resolves.toBe(true);

    expect(axios.delete).toHaveBeenCalledWith(
      `${azureBlobService.apiUrl}/api/file/${encodeURIComponent('2026-10-03T22-39-52-723Z-Screenshot 1.png')}`,
      { params: { blobName } }
    );
  });

  it('surfaces the backend error message on failure', async () => {
    vi.mocked(axios.delete).mockRejectedValue({ response: { data: { message: 'File not found' } } });

    await expect(azureBlobService.deleteFile('CLIENT-1/x/a.png')).rejects.toThrow('Delete failed: File not found');
  });
});
