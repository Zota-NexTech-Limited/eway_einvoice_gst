import express from "express";
const router = express.Router();
import axios from "axios";
import QRCode from "qrcode";


const MICROVISTA_AUTH_URL =
    "http://powergstservice.microvistatech.com/api/MVEINVAuthenticate/EINVAuthentication";

router.post("/api/microvista/generate-irn-auth-token", async (req, res) => {
    try {
        const authPayload = {
            MVApiKey: "IPSZfNmcQCUNMfx",
            MVSecretKey: "NyWQEq+4YWungcL1hfzGQA==",
            gstin: "24AAAPI3182M002",
            eInvoiceUserName: "test_24_001",
            eInvoicePassword: "Trial63$value"
        };

        const response = await axios.post(
            MICROVISTA_AUTH_URL,
            authPayload,
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const data = response.data;

        // ✅ Success case
        if (data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "Auth token generated successfully",
                auth_token: data.AuthToken,
                sek: data.Sek,
                token_expiry: data.TokenExpiry,
                raw: data
            });
        }

        // ❌ Failure from Microvista
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to generate auth token",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista Auth API",
            error: err
        });
    }
});

const MICROVISTA_IRN_URL =
    "http://powergstservice.microvistatech.com/api/MVEINVAuthenticate/EINVGeneration";

router.post("/api/microvista/generate-irn", async (req, res) => {
    try {
        const { authToken, monthYear, ...invoiceData } = req.body;

        // Validate required fields
        if (!authToken || !monthYear) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken or monthYear"
            });
        }

        // Validate invoice data fields
        if (!invoiceData.Version || !invoiceData.TranDtls || !invoiceData.DocDtls ||
            !invoiceData.SellerDtls || !invoiceData.BuyerDtls ||
            !invoiceData.ItemList || !invoiceData.ValDtls) {
            return res.status(400).send({
                status: false,
                message: "Missing required invoice fields"
            });
        }

        // Credentials
        const MVApiKey = "IPSZfNmcQCUNMfx";
        const MVSecretKey = "NyWQEq+4YWungcL1hfzGQA==";
        const gstin = "24AAAPI3182M002";
        const eInvoiceUserName = "test_24_001";
        const eInvoicePassword = "Trial63$value";

        // Make API call - Send invoice data directly in body
        const response = await axios.post(
            MICROVISTA_IRN_URL,
            invoiceData,
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "eInvoiceUserName": eInvoiceUserName,
                    "eInvoicePassword": eInvoicePassword,
                    "authToken": authToken,
                    "MonthYear": monthYear
                }
            }
        );

        const data = response.data;

        // ✅ Success - IRN Generated Successfully
        if (data?.Status === "1") {
            const result: any = {
                status: true,
                message: "IRN generated successfully",
                irn: data.IRN,
                ackNo: data.AckNo,
                ackDate: data.AckDate,
                eInvoiceStatus: data.EInvoiceStatus,
                signedInvoice: data.SignedInvoice,
                signedQRCode: data.SignedQRCode,
                qrCodeImage: data.QrCodeImage,
                authToken: data.AuthToken,
                raw: data
            };

            // ✅ E-way bill also generated
            if (data.EwaybillStatus === "1") {
                result.ewaybill = {
                    status: "success",
                    ewbNo: data.EwbNo,
                    ewbDate: data.EwbDt,
                    ewbValidTill: data.EwbValidTill,
                    distance: data.Distance
                };
            }
            // ⚠️ E-way bill generation failed
            else if (data.EwaybillStatus === "0" && data.ErrorResponse) {
                result.ewaybill = {
                    status: "failed",
                    errors: data.ErrorResponse.map((err: any) => ({
                        errorInfo: err.ErrorInfo,
                        columnName: err.CoulumnName,
                        columnValue: err.ColumnValue
                    }))
                };
            }

            return res.status(200).send(result);
        }

        // ❌ Failure from Microvista
        return res.status(400).send({
            status: false,
            message: "Failed to generate IRN",
            errors: data?.ErrorResponse?.map((err: any) => ({
                errorInfo: err.ErrorInfo,
                columnName: err.CoulumnName,
                columnValue: err.ColumnValue
            })),
            irn: data?.IRN,
            ackNo: data?.AckNo,
            ackDate: data?.AckDate,
            authToken: data?.AuthToken,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista IRN Generation API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GET_IRN_URL =
    "http://powergstservice.microvistatech.com/api/MVEINVAuthenticate/EINVGetIRNDetails";

router.post("/api/microvista/get-irn-details", async (req, res) => {
    try {
        const { irn, authToken } = req.body;

        // Validate required fields
        if (!irn || !authToken) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: irn or authToken"
            });
        }

        // Credentials
        const MVApiKey = "IPSZfNmcQCUNMfx";
        const MVSecretKey = "NyWQEq+4YWungcL1hfzGQA==";
        const gstin = "24AAAPI3182M002";
        const eInvoiceUserName = "test_24_001";
        const eInvoicePassword = "Trial63$value";

        // Make API call
        const response = await axios.post(
            MICROVISTA_GET_IRN_URL,
            {
                IRN: irn
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "eInvoiceUserName": eInvoiceUserName,
                    "eInvoicePassword": eInvoicePassword,
                    "authToken": authToken
                }
            }
        );

        const data = response.data;

        // ✅ Success - IRN Details Retrieved
        if (data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "IRN details retrieved successfully",
                ackNo: data.AckNo,
                ackDate: data.AckDt,
                irn: data.Irn,
                eInvoiceStatus: data.EInvoiceStatus,
                signedInvoice: data.SignedInvoice,
                signedQRCode: data.SignedQRCode,
                ewbNo: data.EwbNo,
                ewbDate: data.EwbDt,
                ewbValidTill: data.EwbValidTill,
                raw: data
            });
        }

        // ❌ Failure from Microvista
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to retrieve IRN details",
            errorCode: data?.ErrorCode,
            irn: data?.Irn,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista Get IRN Details API",
            error: err.response?.data || err.message
        });
    }
});

// GENERATE E-WAY BILL BY IRN
const MICROVISTA_EWAYBILL_BY_IRN_URL =
    "http://powergstservice.microvistatech.com/api/MVEINVAuthenticate/EINVEwaybillByIRN";

router.post("/api/microvista/generate-ewaybill-by-irn", async (req, res) => {
    try {
        const { authToken, ...ewaybillData } = req.body;

        // Validate required fields
        if (!authToken || !ewaybillData.Irn) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken or Irn"
            });
        }

        // Validate additional required fields for e-way bill
        if (!ewaybillData.Distance || !ewaybillData.TransMode) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: Distance or TransMode"
            });
        }

        // Credentials
        const MVApiKey = "IPSZfNmcQCUNMfx";
        const MVSecretKey = "NyWQEq+4YWungcL1hfzGQA==";
        const gstin = "24AAAPI3182M002";
        const eInvoiceUserName = "test_24_001";
        const eInvoicePassword = "Trial63$value";

        // Make API call
        const response = await axios.post(
            MICROVISTA_EWAYBILL_BY_IRN_URL,
            ewaybillData,
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "eInvoiceUserName": eInvoiceUserName,
                    "eInvoicePassword": eInvoicePassword,
                    "authToken": authToken
                }
            }
        );

        const data = response.data;

        // ✅ Success - E-way Bill Generated
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "E-way bill generated successfully",
                ewbNo: data.EwbNo,
                ewbDate: data.EwbDt,
                ewbValidTill: data.EwbValidTill,
                distance: data.Distance,
                alert: data.Alert,
                raw: data
            });
        }

        // ❌ Failure from Microvista
        return res.status(400).send({
            status: false,
            message: "Failed to generate e-way bill",
            errors: data?.ErrorDetails?.map((err: any) => ({
                errorCode: err.ErrorCode,
                errorMessage: err.ErrorMessage
            })) || [],
            ewbNo: data?.EwbNo,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista E-way Bill API",
            error: err.response?.data || err.message
        });
    }
});

// DECODE SIGNED INVOICE (JWT)
router.post("/api/microvista/decode-invoice", async (req, res) => {
    try {
        const { signedInvoice } = req.body;

        if (!signedInvoice) {
            return res.status(400).send({
                status: false,
                message: "Missing required field: signedInvoice"
            });
        }

        // Decode JWT without verification (sandbox tokens)
        // Split the JWT into parts
        const parts = signedInvoice.split('.');
        if (parts.length !== 3) {
            return res.status(400).send({
                status: false,
                message: "Invalid JWT format"
            });
        }

        // Decode the payload (second part)
        const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
        const decodedData = JSON.parse(payload);

        // Parse the nested data field if it's a string
        let invoiceData = decodedData;
        if (decodedData.data && typeof decodedData.data === 'string') {
            invoiceData.data = JSON.parse(decodedData.data);
        }

        return res.status(200).send({
            status: true,
            message: "Invoice decoded successfully",
            decoded: invoiceData
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Failed to decode invoice",
            error: err.message
        });
    }
});

// GENERATE QR CODE IMAGE
router.post("/api/microvista/generate-qr-image", async (req, res) => {
    try {
        const { signedQRCode } = req.body;

        if (!signedQRCode) {
            return res.status(400).send({
                status: false,
                message: "Missing required field: signedQRCode"
            });
        }


        // Generate QR code as base64 image
        const qrImage = await QRCode.toDataURL(signedQRCode, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            width: 300,
            margin: 1
        });

        return res.status(200).send({
            status: true,
            message: "QR code generated successfully",
            qrCodeImage: qrImage, // Base64 image string
            signedQRCode: signedQRCode
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Failed to generate QR code",
            error: err.message
        });
    }
});

// CANCEL IRN API
const MICROVISTA_CANCEL_IRN_URL =
    "http://powergstservice.microvistatech.com/api/MVEINVAuthenticate/EINVCancelIRN";

router.post("/api/microvista/cancel-irn", async (req, res) => {
    try {
        const { authToken, Irn, CnlRsn, CnlRem } = req.body;

        // Validate required fields
        if (!authToken || !Irn || !CnlRsn || !CnlRem) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, Irn, CnlRsn, or CnlRem"
            });
        }

        // Credentials
        const MVApiKey = "IPSZfNmcQCUNMfx";
        const MVSecretKey = "NyWQEq+4YWungcL1hfzGQA==";
        const gstin = "24AAAPI3182M002";
        const eInvoiceUserName = "test_24_001";
        const eInvoicePassword = "Trial63$value";

        // Make API call
        const response = await axios.post(
            MICROVISTA_CANCEL_IRN_URL,
            {
                Irn: Irn,
                CnlRsn: CnlRsn,
                CnlRem: CnlRem
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "eInvoiceUserName": eInvoiceUserName,
                    "eInvoicePassword": eInvoicePassword,
                    "authToken": authToken
                }
            }
        );

        const data = response.data;

        // ✅ Success - IRN Cancelled
        if (data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "IRN cancelled successfully",
                irn: data.IRN,
                cancelDate: data.CancelDate,
                raw: data
            });
        }

        // ❌ Failure from Microvista
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to cancel IRN",
            errorCode: data?.ErrorCode,
            irn: data?.IRN,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista Cancel IRN API",
            error: err.response?.data || err.message
        });
    }
});

// CANCEL E-WAY BILL API
const MICROVISTA_CANCEL_EWAYBILL_URL =
    "http://powergstservice.microvistatech.com/api/MVEINVAuthenticate/EINVCancelEWaybill";

router.post("/api/microvista/cancel-ewaybill", async (req, res) => {
    try {
        const { authToken, ewbNo, cancelRsnCode, cancelRmrk } = req.body;

        // Validate required fields
        if (!authToken || !ewbNo || !cancelRsnCode || !cancelRmrk) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, ewbNo, cancelRsnCode, or cancelRmrk"
            });
        }

        // Credentials
        const MVApiKey = "IPSZfNmcQCUNMfx";
        const MVSecretKey = "NyWQEq+4YWungcL1hfzGQA==";
        const gstin = "24AAAPI3182M002";
        const eInvoiceUserName = "test_24_001";
        const eInvoicePassword = "Trial63$value";

        // Make API call
        const response = await axios.post(
            MICROVISTA_CANCEL_EWAYBILL_URL,
            {
                ewbNo: ewbNo,
                cancelRsnCode: cancelRsnCode,
                cancelRmrk: cancelRmrk
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "eInvoiceUserName": eInvoiceUserName,
                    "eInvoicePassword": eInvoicePassword,
                    "authToken": authToken
                }
            }
        );

        const data = response.data;

        // ✅ Success - E-way Bill Cancelled
        if (data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "E-way bill cancelled successfully",
                ewbNo: data.EwayBillNo,
                cancelDate: data.CancelDate,
                raw: data
            });
        }

        // ❌ Failure from Microvista
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to cancel e-way bill",
            ewbNo: data?.EwayBillNo,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista Cancel E-way Bill API",
            error: err.response?.data || err.message
        });
    }
});

export default router;
