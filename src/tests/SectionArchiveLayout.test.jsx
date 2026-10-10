import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SectionArchiveLayout from '../components/shared/SectionArchiveLayout';

vi.mock('../backend/services/azureBlobService', () => ({
  azureBlobService: { generateDownloadUrl: vi.fn().mockResolvedValue('https://signed/url') }
}));

const files = [
  { blobName: 'c1/S5__Lab_Results/a.pdf', fileName: 'a.pdf', docType: 'Lab Results', fileSize: 2048, uploadDate: new Date().toISOString(), uploader: 'Nurse Joy' },
  { blobName: 'c1/S5__Care_Plan/b.docx', fileName: 'b.docx', docType: 'Care Plan', fileSize: 1024, uploadDate: '2020-01-01T00:00:00Z' }
];

const renderLayout = (props = {}) => render(
  <SectionArchiveLayout
    title="Test Archive"
    categories={['Lab Results', 'Care Plan']}
    files={files}
    onUpload={vi.fn().mockResolvedValue()}
    onDownload={vi.fn()}
    onDelete={vi.fn().mockResolvedValue()}
    {...props}
  />
);

describe('SectionArchiveLayout', () => {
  it('renders summary stats, upload cards, files and extra columns', () => {
    renderLayout({ extraColumns: [{ header: 'Uploaded By', render: f => f.uploader || '—' }] });

    expect(screen.getByText('Test Archive')).toBeInTheDocument();
    expect(screen.getByText('Total Files')).toBeInTheDocument();
    expect(screen.getByText('Recent (30 days)')).toBeInTheDocument();
    expect(screen.getByText('Upload Documents')).toBeInTheDocument();
    expect(screen.getByText('Archived Documents (2)')).toBeInTheDocument();
    expect(screen.getByText('a.pdf')).toBeInTheDocument();
    expect(screen.getByText('Uploaded By')).toBeInTheDocument();
    expect(screen.getByText('Nurse Joy')).toBeInTheDocument();
  });

  it('opens the upload dialog for the chosen category and uploads', async () => {
    const onUpload = vi.fn().mockResolvedValue();
    const { container } = renderLayout({ onUpload });

    const file = new File(['x'], 'scan.pdf', { type: 'application/pdf' });
    const inputs = container.querySelectorAll('input[type="file"]');
    fireEvent.change(inputs[1], { target: { files: [file] } });

    expect(screen.getByText('Upload Care Plan')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith('Care Plan', file));
  });

  it('rejects unsupported file types', () => {
    const onError = vi.fn();
    const onUpload = vi.fn();
    const { container } = renderLayout({ onError, onUpload });

    const file = new File(['x'], 'run.exe', { type: 'application/x-msdownload' });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });

    expect(onError).toHaveBeenCalled();
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('confirms before deleting', async () => {
    const onDelete = vi.fn().mockResolvedValue();
    renderLayout({ onDelete });

    fireEvent.click(screen.getAllByLabelText('Delete')[0]);
    expect(screen.getByText(/Are you sure you want to delete "a.pdf"/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(files[0]));
  });

  it('opens a signed inline URL to preview PDFs', async () => {
    const tab = { location: { href: '' }, close: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(tab);
    renderLayout();

    fireEvent.click(screen.getAllByLabelText('Preview')[0]);

    await waitFor(() => expect(tab.location.href).toBe('https://signed/url'));
    open.mockRestore();
  });

  it('offers download for files the browser cannot preview', () => {
    const onDownload = vi.fn();
    renderLayout({ onDownload });

    fireEvent.click(screen.getAllByLabelText('Preview')[1]);
    expect(screen.getByText('Preview not available for this file type')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download to View' }));
    expect(onDownload).toHaveBeenCalledWith(files[1]);
  });

  it('hides delete where canDelete is false and upload in export mode', () => {
    renderLayout({ canDelete: f => f.fileName !== 'a.pdf', exportMode: true });
    expect(screen.queryByText('Upload Documents')).not.toBeInTheDocument();
    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
  });
});
