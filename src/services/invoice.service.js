const PDFDocument = require('pdfkit');

const generateInvoicePDF = (order) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc
      .fillColor('#00b14f')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('ZINGER Grocery', 50, 50);

    doc
      .fillColor('#333')
      .fontSize(10)
      .font('Helvetica')
      .text('Instant Grocery Delivery', 50, 78);

    // Invoice title
    doc
      .fillColor('#00b14f')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('INVOICE', 400, 50, { align: 'right' });

    doc
      .fillColor('#666')
      .fontSize(10)
      .font('Helvetica')
      .text(`Order ID: ${order.orderId}`, 400, 78, { align: 'right' })
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 400, 92, { align: 'right' });

    // Horizontal line
    doc.moveTo(50, 115).lineTo(545, 115).strokeColor('#e5e5e5').stroke();

    // Customer & Delivery Info
    doc
      .fillColor('#333')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Bill To:', 50, 135);

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(order.user?.name || order.deliveryAddress.fullName, 50, 152)
      .text(order.user?.email || '', 50, 166)
      .text(order.deliveryAddress.phone, 50, 180);

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('Deliver To:', 300, 135);

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(order.deliveryAddress.street, 300, 152)
      .text(`${order.deliveryAddress.city}, ${order.deliveryAddress.state}`, 300, 166)
      .text(`Pincode: ${order.deliveryAddress.pincode}`, 300, 180);

    // Table header
    const tableTop = 220;
    doc.moveTo(50, tableTop - 5).lineTo(545, tableTop - 5).strokeColor('#e5e5e5').stroke();

    doc
      .fillColor('#fff')
      .rect(50, tableTop, 495, 25)
      .fill('#00b14f');

    doc
      .fillColor('#fff')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Item', 60, tableTop + 7)
      .text('Qty', 350, tableTop + 7)
      .text('Price', 400, tableTop + 7)
      .text('Total', 480, tableTop + 7);

    // Table rows
    let y = tableTop + 35;
    order.items.forEach((item, i) => {
      if (i % 2 === 0) {
        doc.fillColor('#f9f9f9').rect(50, y - 5, 495, 22).fill();
      }

      doc
        .fillColor('#333')
        .font('Helvetica')
        .fontSize(10)
        .text(item.name, 60, y, { width: 280 })
        .text(item.quantity.toString(), 350, y)
        .text(`₹${item.discountedPrice || item.price}`, 400, y)
        .text(`₹${item.total}`, 480, y);

      y += 25;
    });

    // Totals
    y += 15;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e5e5').stroke();
    y += 15;

    const addRow = (label, value, bold = false) => {
      doc
        .fillColor('#555')
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(10)
        .text(label, 350, y)
        .text(value, 480, y);
      y += 20;
    };

    addRow('Subtotal:', `₹${order.subtotal}`);
    addRow('Delivery Charges:', order.deliveryCharges === 0 ? 'FREE' : `₹${order.deliveryCharges}`);
    if (order.couponDiscount > 0) addRow('Coupon Discount:', `-₹${order.couponDiscount}`);
    addRow('Tax (5%):', `₹${order.tax}`);
    y += 5;
    doc.moveTo(350, y).lineTo(545, y).strokeColor('#333').stroke();
    y += 8;
    addRow('TOTAL:', `₹${order.totalAmount}`, true);

    // Payment info
    y += 20;
    doc
      .fillColor('#666')
      .fontSize(10)
      .font('Helvetica')
      .text(`Payment Method: ${order.paymentMethod.toUpperCase()}`, 50, y)
      .text(`Payment Status: ${order.paymentStatus.toUpperCase()}`, 50, y + 15);

    // Footer
    doc
      .fillColor('#999')
      .fontSize(9)
      .text('Thank you for shopping with ZINGER Grocery! For support: support@ZINGERclone.com', 50, 720, { align: 'center', width: 495 });

    doc.end();
  });
};

module.exports = { generateInvoicePDF };
