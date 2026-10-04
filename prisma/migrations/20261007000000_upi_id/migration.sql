-- UPI ID shown as a "scan to pay" QR code on bill PDFs.
ALTER TABLE "properties" ADD COLUMN "upi_id" TEXT;
