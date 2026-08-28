import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { CODIGIX_LOGO_B64 } from './codigixLogoB64';

export const generateQuotationPDF = async (formData) => {
  if (!formData) return;

  const quotationNumber = formData.quotationNumber || formData.estimation_number || 'Q-2026-001';
  
  let formattedDate = 'N/A';
  const qDateVal = formData.quotationDate || formData.estimate_date;
  if (qDateVal) {
    const d = new Date(qDateVal);
    formattedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  let formattedValidUntil = '';
  const vDateVal = formData.validUntil || formData.expiry_date;
  if (vDateVal) {
    const d = new Date(vDateVal);
    formattedValidUntil = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const clientName = formData.client || formData.company_name || formData.client_name || '';
  const contactPerson = formData.contactPerson || formData.contact_person || clientName || 'Valued Client';
  const businessType = formData.businessType || formData.address || 'Pimpri, Pune';
  
  const items = Array.isArray(formData.items) && formData.items.length > 0 
    ? formData.items 
    : [{ productName: formData.project_name || 'Software Development', rate: formData.amount || formData.total || 0, quantity: 1 }];

  const subtotal = items.reduce((sum, item) => sum + ((parseFloat(item.rate) || 0) * (parseFloat(item.quantity) || 1)), 0);
  const discount = parseFloat(formData.discount) || 0;
  const taxPercentage = parseFloat(formData.taxPercentage || formData.tax_percentage) || 0;
  const tax = Math.round((subtotal - discount) * (taxPercentage / 100) * 100) / 100;
  const total = Math.round((subtotal - discount + tax) * 100) / 100;

  const logoSrc = window.location.origin + '/codigix-logo.png';

  // Create temporary container for html2canvas
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '794px';
  container.style.minHeight = '1123px';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = "'Inter', 'Segoe UI', Arial, sans-serif";
  container.style.color = '#111827';
  container.style.boxSizing = 'border-box';
  container.style.padding = '40px 40px 60px 40px';
  container.style.overflow = 'hidden';

  container.innerHTML = `
    <div style="position: relative; min-height: 1040px; display: flex; flex-direction: column; justify-content: space-between;">
      <!-- Top Right Grey Geometry -->
      <div style="position: absolute; top: -40px; right: -40px; width: 260px; height: 45px; background: #8E9096; clip-path: polygon(0 0, 100% 0, 100% 100%, 45px 100%);"></div>

      <div>
        <!-- Header Section -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 35px; padding-top: 10px;">
          <!-- Left: Codigix Logo + Customer Details -->
          <div>
            <div style="margin-bottom: 20px;">
              <img src="${logoSrc}" alt="Codigix Infotech" style="height: 60px; object-fit: contain;" />
            </div>

            <div style="font-size: 13px; color: #374151; line-height: 1.6;">
              <div style="color: #6B7280; margin-bottom: 4px; font-weight: 500;">Quotation To:</div>
              <div style="font-size: 16px; font-weight: 800; color: #111827; margin-bottom: 2px;">${contactPerson}</div>
              <div style="font-size: 13px; font-weight: 600; color: #374151;">${clientName}</div>
              <div style="font-size: 13px; color: #6B7280;">${businessType}</div>
            </div>
          </div>

          <!-- Right: Quotation Title & Details -->
          <div style="text-align: right; margin-top: 25px;">
            <div style="font-size: 40px; font-weight: 900; color: #1F2D5A; letter-spacing: 2px; margin-bottom: 15px; font-family: sans-serif;">QUOTATION</div>
            <div style="font-size: 13px; color: #374151; line-height: 1.8;">
              <div><span style="color: #6B7280; font-weight: 600;">Quotation No:</span> <span style="font-weight: 700; color: #111827;">${quotationNumber}</span></div>
              <div><span style="color: #6B7280; font-weight: 600;">Quotation Date:</span> <span style="font-weight: 700; color: #111827;">${formattedDate}</span></div>
              ${formattedValidUntil ? `<div><span style="color: #6B7280; font-weight: 600;">Valid Until:</span> <span style="font-weight: 700; color: #111827;">${formattedValidUntil}</span></div>` : ''}
            </div>
          </div>
        </div>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 30px; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #1F2D5A; color: #ffffff; font-size: 12px; font-weight: 800; text-transform: uppercase;">
              <th style="padding: 12px 18px; text-align: left; letter-spacing: 1px;">DESCRIPTION</th>
              <th style="padding: 12px 18px; text-align: right; letter-spacing: 1px; width: 180px;">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr style="border-bottom: 1.5px solid #E5E7EB;">
                <td style="padding: 14px 18px; font-size: 13px; font-weight: 700; color: #111827;">
                  ${item.productName || item.item_name || 'Software Services'}
                  ${item.description ? `<div style="font-size: 11px; color: #6B7280; font-weight: 400; margin-top: 3px;">${item.description}</div>` : ''}
                </td>
                <td style="padding: 14px 18px; text-align: right; font-size: 14px; font-weight: 800; color: #111827;">
                  ${Number((parseFloat(item.rate) || 0) * (parseFloat(item.quantity) || 1)).toLocaleString()}/-
                </td>
              </tr>
            `).join('')}
            ${Array(Math.max(0, 3 - items.length)).fill(0).map(() => `
              <tr style="border-bottom: 1.5px solid #E5E7EB; height: 45px;">
                <td style="padding: 14px 18px;"></td>
                <td style="padding: 14px 18px;"></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals Block -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
          <div style="width: 320px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; padding: 6px 4px;">
              <span style="font-weight: 700; color: #111827;">Sub-total:</span>
              <span style="font-weight: 800; color: #111827;">${Number(subtotal).toLocaleString()}/-</span>
            </div>
            ${discount > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 6px 4px;">
                <span style="font-weight: 700; color: #111827;">Discount:</span>
                <span style="font-weight: 800; color: #111827;">-${Number(discount).toLocaleString()}/-</span>
              </div>
            ` : ''}
            ${taxPercentage > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 6px 4px;">
                <span style="font-weight: 700; color: #111827;">Tax (${taxPercentage}%):</span>
                <span style="font-size: 13px; color: #111827; font-weight: 600;">${Number(tax).toLocaleString()}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; background-color: #1F2D5A; color: #ffffff; padding: 10px 16px; margin-top: 10px; border-radius: 2px; font-size: 15px; font-weight: 900;">
              <span>Total:</span>
              <span>${Number(total).toLocaleString()}/-</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Section -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px;">
          <!-- Payment Method -->
          <div style="font-size: 11px; color: #374151; line-height: 1.7;">
            <div style="font-size: 12px; font-weight: 800; color: #111827; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">PAYMENT METHOD</div>
            <div style="display: grid; grid-template-columns: 95px 1fr; gap: 3px;">
              <span style="font-weight: 600; color: #6B7280;">Account No:</span>
              <span style="font-weight: 700; color: #111827;">07230200002504</span>
              <span style="font-weight: 600; color: #6B7280;">Account Name:</span>
              <span style="font-weight: 700; color: #111827;">Codigix Infotech</span>
              <span style="font-weight: 600; color: #6B7280;">IFSC Code:</span>
              <span style="font-weight: 700; color: #111827;">BARB0CHINCH</span>
              <span style="font-weight: 600; color: #6B7280;">Branch Name:</span>
              <span style="font-weight: 700; color: #111827;">Bank of baroda pimpri</span>
            </div>
          </div>

          <!-- Signature & Contact -->
          <div style="text-align: right; font-size: 11px; color: #374151;">
            <div style="margin-bottom: 25px; line-height: 1.7;">
              <div><span style="font-weight: 600; color: #6B7280;">Phone:</span> <span style="font-weight: 700; color: #111827;">7066556768</span></div>
              <div><span style="font-weight: 600; color: #6B7280;">Email:</span> <span style="font-weight: 700; color: #111827;">Codigixinfotech@gmail.com</span></div>
            </div>

            <div style="display: inline-block; text-align: center; border-top: 1.5px solid #111827; padding-top: 6px; width: 170px;">
              <div style="font-size: 13px; font-weight: 800; color: #111827;">Nitin Kamble</div>
              <div style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase;">CEO</div>
            </div>
          </div>
        </div>

        <!-- Address Bar -->
        <div style="margin-left: -40px; margin-right: -40px; margin-bottom: -40px; height: 36px; background: #8E9096; color: #ffffff; display: flex; align-items: center; justify-content: space-between; padding-left: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px;">
          <span>Add: Office 309, Bramha Sky Uzuri, Pimpri Chowk, Pimpri - 18</span>
          <div style="width: 30px; height: 36px; background: #ffffff; clip-path: polygon(100% 0, 0 100%, 100% 100%);"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Quotation-${quotationNumber}.pdf`);
  } catch (err) {
    console.error('Error generating quotation PDF:', err);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

export const generateQuotationPDFBase64 = async (formData) => {
  if (!formData) return null;

  const quotationNumber = formData.quotationNumber || formData.estimation_number || 'Q-2026-001';
  
  let formattedDate = 'N/A';
  const qDateVal = formData.quotationDate || formData.estimate_date;
  if (qDateVal) {
    const d = new Date(qDateVal);
    formattedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  let formattedValidUntil = '';
  const vDateVal = formData.validUntil || formData.expiry_date;
  if (vDateVal) {
    const d = new Date(vDateVal);
    formattedValidUntil = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const clientName = formData.client || formData.company_name || formData.client_name || '';
  const contactPerson = formData.contactPerson || formData.contact_person || clientName || 'Valued Client';
  const businessType = formData.businessType || formData.address || 'Pimpri, Pune';
  
  const items = Array.isArray(formData.items) && formData.items.length > 0 
    ? formData.items 
    : [{ productName: formData.project_name || 'Software Development', rate: formData.amount || formData.total || 0, quantity: 1 }];

  const subtotal = items.reduce((sum, item) => sum + ((parseFloat(item.rate) || 0) * (parseFloat(item.quantity) || 1)), 0);
  const discount = parseFloat(formData.discount) || 0;
  const taxPercentage = parseFloat(formData.taxPercentage || formData.tax_percentage) || 0;
  const tax = Math.round((subtotal - discount) * (taxPercentage / 100) * 100) / 100;
  const total = Math.round((subtotal - discount + tax) * 100) / 100;

  const logoSrc = window.location.origin + '/codigix-logo.png';

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '794px';
  container.style.minHeight = '1123px';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = "'Inter', 'Segoe UI', Arial, sans-serif";
  container.style.color = '#111827';
  container.style.boxSizing = 'border-box';
  container.style.padding = '40px 40px 60px 40px';
  container.style.overflow = 'hidden';

  container.innerHTML = `
    <div style="position: relative; min-height: 1040px; display: flex; flex-direction: column; justify-content: space-between;">
      <div style="position: absolute; top: -40px; right: -40px; width: 260px; height: 45px; background: #8E9096; clip-path: polygon(0 0, 100% 0, 100% 100%, 45px 100%);"></div>

      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 35px; padding-top: 10px;">
          <div>
            <div style="margin-bottom: 20px;">
              <img src="${logoSrc}" alt="Codigix Infotech" style="height: 60px; object-fit: contain;" />
            </div>

            <div style="font-size: 13px; color: #374151; line-height: 1.6;">
              <div style="color: #6B7280; margin-bottom: 4px; font-weight: 500;">Quotation To:</div>
              <div style="font-size: 16px; font-weight: 800; color: #111827; margin-bottom: 2px;">${contactPerson}</div>
              <div style="font-size: 13px; font-weight: 600; color: #374151;">${clientName}</div>
              <div style="font-size: 13px; color: #6B7280;">${businessType}</div>
            </div>
          </div>

          <div style="text-align: right; margin-top: 25px;">
            <div style="font-size: 40px; font-weight: 900; color: #1F2D5A; letter-spacing: 2px; margin-bottom: 15px; font-family: sans-serif;">QUOTATION</div>
            <div style="font-size: 13px; color: #374151; line-height: 1.8;">
              <div><span style="color: #6B7280; font-weight: 600;">Quotation No:</span> <span style="font-weight: 700; color: #111827;">${quotationNumber}</span></div>
              <div><span style="color: #6B7280; font-weight: 600;">Quotation Date:</span> <span style="font-weight: 700; color: #111827;">${formattedDate}</span></div>
              ${formattedValidUntil ? `<div><span style="color: #6B7280; font-weight: 600;">Valid Until:</span> <span style="font-weight: 700; color: #111827;">${formattedValidUntil}</span></div>` : ''}
            </div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 30px; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #1F2D5A; color: #ffffff; font-size: 12px; font-weight: 800; text-transform: uppercase;">
              <th style="padding: 12px 18px; text-align: left; letter-spacing: 1px;">DESCRIPTION</th>
              <th style="padding: 12px 18px; text-align: right; letter-spacing: 1px; width: 180px;">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr style="border-bottom: 1.5px solid #E5E7EB;">
                <td style="padding: 14px 18px; font-size: 13px; font-weight: 700; color: #111827;">
                  ${item.productName || item.item_name || 'Software Services'}
                  ${item.description ? `<div style="font-size: 11px; color: #6B7280; font-weight: 400; margin-top: 3px;">${item.description}</div>` : ''}
                </td>
                <td style="padding: 14px 18px; text-align: right; font-size: 14px; font-weight: 800; color: #111827;">
                  ${Number((parseFloat(item.rate) || 0) * (parseFloat(item.quantity) || 1)).toLocaleString()}/-
                </td>
              </tr>
            `).join('')}
            ${Array(Math.max(0, 3 - items.length)).fill(0).map(() => `
              <tr style="border-bottom: 1.5px solid #E5E7EB; height: 45px;">
                <td style="padding: 14px 18px;"></td>
                <td style="padding: 14px 18px;"></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
          <div style="width: 320px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; padding: 6px 4px;">
              <span style="font-weight: 700; color: #111827;">Sub-total:</span>
              <span style="font-weight: 800; color: #111827;">${Number(subtotal).toLocaleString()}/-</span>
            </div>
            ${discount > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 6px 4px;">
                <span style="font-weight: 700; color: #111827;">Discount:</span>
                <span style="font-weight: 800; color: #111827;">-${Number(discount).toLocaleString()}/-</span>
              </div>
            ` : ''}
            ${taxPercentage > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 6px 4px;">
                <span style="font-weight: 700; color: #111827;">Tax (${taxPercentage}%):</span>
                <span style="font-size: 13px; color: #111827; font-weight: 600;">${Number(tax).toLocaleString()}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; background-color: #1F2D5A; color: #ffffff; padding: 10px 16px; margin-top: 10px; border-radius: 2px; font-size: 15px; font-weight: 900;">
              <span>Total:</span>
              <span>${Number(total).toLocaleString()}/-</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px;">
          <div style="font-size: 11px; color: #374151; line-height: 1.7;">
            <div style="font-size: 12px; font-weight: 800; color: #111827; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">PAYMENT METHOD</div>
            <div style="display: grid; grid-template-columns: 95px 1fr; gap: 3px;">
              <span style="font-weight: 600; color: #6B7280;">Account No:</span>
              <span style="font-weight: 700; color: #111827;">07230200002504</span>
              <span style="font-weight: 600; color: #6B7280;">Account Name:</span>
              <span style="font-weight: 700; color: #111827;">Codigix Infotech</span>
              <span style="font-weight: 600; color: #6B7280;">IFSC Code:</span>
              <span style="font-weight: 700; color: #111827;">BARB0CHINCH</span>
              <span style="font-weight: 600; color: #6B7280;">Branch Name:</span>
              <span style="font-weight: 700; color: #111827;">Bank of baroda pimpri</span>
            </div>
          </div>

          <div style="text-align: right; font-size: 11px; color: #374151;">
            <div style="margin-bottom: 25px; line-height: 1.7;">
              <div><span style="font-weight: 600; color: #6B7280;">Phone:</span> <span style="font-weight: 700; color: #111827;">7066556768</span></div>
              <div><span style="font-weight: 600; color: #6B7280;">Email:</span> <span style="font-weight: 700; color: #111827;">Codigixinfotech@gmail.com</span></div>
            </div>

            <div style="display: inline-block; text-align: center; border-top: 1.5px solid #111827; padding-top: 6px; width: 170px;">
              <div style="font-size: 13px; font-weight: 800; color: #111827;">Nitin Kamble</div>
              <div style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase;">CEO</div>
            </div>
          </div>
        </div>

        <div style="margin-left: -40px; margin-right: -40px; margin-bottom: -40px; height: 36px; background: #8E9096; color: #ffffff; display: flex; align-items: center; justify-content: space-between; padding-left: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px;">
          <span>Add: Office 309, Bramha Sky Uzuri, Pimpri Chowk, Pimpri - 18</span>
          <div style="width: 30px; height: 36px; background: #ffffff; clip-path: polygon(100% 0, 0 100%, 100% 100%);"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    return pdf.output('datauristring');
  } catch (err) {
    console.error('Error generating quotation PDF base64:', err);
    return null;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};
