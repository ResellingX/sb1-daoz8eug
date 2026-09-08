import { useEffect, useState } from 'react';
import { Download, Eye, FileText, LoaderCircle, Menu, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Invoice = {
  id: string;
  name: string;
  file_data: string;
  file_size: number;
  created_at: string;
};

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('bad'));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function InvoicesPage({ openMenu }: { openMenu: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewInv, setPreviewInv] = useState<Invoice | null>(null);
  const [renaming, setRenaming] = useState<Invoice | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const result = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
      if (mounted && !result.error) setInvoices((result.data ?? []) as Invoice[]);
      if (mounted) setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('Solo se permiten archivos PDF.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('El archivo no puede superar 10 MB.'); return; }
    setError('');
    setUploading(true);
    try {
      const data = await readFileAsDataUrl(file);
      const baseName = file.name.replace(/\.pdf$/i, '');
      const result = await supabase.from('invoices').insert({ name: baseName, file_data: data, file_size: file.size }).select('*').maybeSingle();
      if (result.error || !result.data) throw result.error ?? new Error('fail');
      setInvoices((cur) => [result.data as Invoice, ...cur]);
    } catch {
      setError('No se pudo subir la factura.');
    }
    setUploading(false);
  };

  const handleDelete = async (inv: Invoice) => {
    if (!confirm(`¿Eliminar "${inv.name}"?`)) return;
    const result = await supabase.from('invoices').delete().eq('id', inv.id);
    if (!result.error) setInvoices((cur) => cur.filter((i) => i.id !== inv.id));
  };

  const saveRename = async () => {
    if (!renaming || !renameValue.trim()) return;
    const result = await supabase.from('invoices').update({ name: renameValue.trim() }).eq('id', renaming.id).select('*').maybeSingle();
    if (!result.error && result.data) {
      setInvoices((cur) => cur.map((i) => i.id === renaming.id ? result.data as Invoice : i));
    }
    setRenaming(null);
  };

  const handleExport = () => {
    const lines = [
      'RESUMEN PARA DECLARACIÓN FISCAL',
      `Generado: ${new Date().toLocaleDateString('es-ES')}`,
      '═'.repeat(50),
      '',
      `Total facturas: ${invoices.length}`,
      '',
      'LISTADO DE FACTURAS:',
      '',
    ];
    invoices.forEach((inv, i) => {
      lines.push(`${i + 1}. ${inv.name}`);
      lines.push(`   Fecha: ${new Date(inv.created_at).toLocaleDateString('es-ES')}`);
      lines.push(`   Tamaño: ${formatBytes(inv.file_size)}`);
      lines.push('');
    });
    lines.push('─'.repeat(50));
    lines.push('Nota: Los PDFs originales deben adjuntarse junto con este resumen.');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ResellingX_Declaracion_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="page-shell invoices-page">
      <header className="sales-header">
        <button className="icon-button" onClick={openMenu} aria-label="Abrir menú"><Menu size={26} /></button>
        <h1>Facturas y Contabilidad</h1>
        <div className="header-spacer" />
      </header>

      {error && <p className="page-error">{error}</p>}

      <div className="inv-upload-zone">
        <label className="inv-upload-btn">
          <input type="file" accept="application/pdf" onChange={(e) => { void handleUpload(e.target.files?.[0]); e.target.value = ''; }} hidden />
          {uploading ? <LoaderCircle className="spin" size={20} /> : <Upload size={20} />}
          {uploading ? 'Subiendo...' : 'Subir Factura PDF'}
        </label>
        {invoices.length > 0 && (
          <button className="inv-export-btn" onClick={handleExport}>
            <Download size={18} /> Exportar para Declaración
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-state"><LoaderCircle className="spin" size={30} /><p>Cargando facturas...</p></div>
      ) : invoices.length === 0 ? (
        <div className="empty-sales">
          <FileText size={36} />
          <p>No hay facturas subidas.</p>
        </div>
      ) : (
        <section className="invoice-list">
          {invoices.map((inv) => (
            <div className="invoice-row" key={inv.id}>
              <div className="invoice-row-icon"><FileText size={22} /></div>
              <div className="invoice-row-info">
                <strong>{inv.name}</strong>
                <span>{new Date(inv.created_at).toLocaleDateString('es-ES')} · {formatBytes(inv.file_size)}</span>
              </div>
              <div className="invoice-row-actions">
                <button onClick={() => setPreviewInv(inv)} title="Previsualizar"><Eye size={16} /></button>
                <button onClick={() => { setRenaming(inv); setRenameValue(inv.name); }} title="Renombrar"><Pencil size={16} /></button>
                <button onClick={() => handleDelete(inv)} title="Eliminar" className="invoice-del"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Preview modal */}
      {previewInv && (
        <div className="modal-layer" onClick={() => setPreviewInv(null)}>
          <div className="invoice-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="invoice-preview-header">
              <h3>{previewInv.name}</h3>
              <button onClick={() => setPreviewInv(null)}><X size={22} /></button>
            </div>
            <iframe className="invoice-preview-frame" src={previewInv.file_data} title={previewInv.name} />
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renaming && (
        <div className="modal-layer" onClick={() => setRenaming(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Renombrar factura</h3>
            <p className="modal-hint">Introduce el nuevo nombre</p>
            <div className="modal-input-wrap">
              <input
                className="modal-input"
                style={{ fontSize: '16px', padding: '0 14px' }}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void saveRename(); }}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setRenaming(null)}>Cancelar</button>
              <button className="modal-save" onClick={() => void saveRename()}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
