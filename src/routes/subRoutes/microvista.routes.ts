import express from "express";
const router = express.Router();
import axios from "axios";
import QRCode from "qrcode";

// ================ MICROVISTA E-INVOICE ROUTES ================

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

// =============== END OF MICROVISTA E-INVOICE ROUTES ================


// =============== MICROVISTA E-WAY BILL ROUTES ================

const MICROVISTA_EWAYBILL_AUTH_URL =
    "http://powergstservice.microvistatech.com/Api/MVEWBAuthenticate/MVAuthentication";

router.post("/api/microvista/generate-ewaybill-auth-token", async (req, res) => {
    try {
        const authPayload = {
            MVApiKey: "IPSZfNmcQCUNMfx",
            MVSecretKey: "NyWQEq+4YWungcL1hfzGQA==",
            gstin: "24AAAPI3182M002",
            eWayBillUserName: "test_24_001",
            eWayBillPassword: "Trial63$value"
        };

        const response = await axios.post(
            MICROVISTA_EWAYBILL_AUTH_URL,
            authPayload,
            {
                headers: { "Content-Type": "application/json" }
            }
        );

        const data = response.data;

        // Success
        if (data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "E-way bill auth token generated successfully",
                authenticationToken: data.AuthenticationToken,
                raw: data
            });
        }

        // Failure
        return res.status(400).send({
            status: false,
            message: data?.Message || "Failed to generate e-way bill auth token",
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista E-way Bill Auth API",
            error: err.response?.data || err.message
        });
    }
});

// GENERATE E-WAY BILL STANDALONE
const MICROVISTA_STANDALONE_EWAYBILL_URL =
    "https://powergstservice.microvistatech.com/api/MVEWBAuthenticate/MVGenerationWithDist";

router.post("/api/microvista/generate-standalone-ewaybill", async (req, res) => {
    try {
        const { authenticationToken, monthYear, ...ewaybillData } = req.body;

        // Validate required fields
        if (!authenticationToken || !monthYear) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authenticationToken or monthYear"
            });
        }

        // Validate ewaybillData structure
        if (!ewaybillData.version || !ewaybillData.billLists) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: version or billLists in ewaybillData"
            });
        }

        // Credentials
        const MVApiKey = "IPSZfNmcQCUNMfx";
        const MVSecretKey = "NyWQEq+4YWungcL1hfzGQA==";
        const gstin = "24AAAPI3182M002";
        const eWayBillUserName = "test_24_001";
        const eWayBillPassword = "Trial63$value";

        console.log("=== DEBUG: E-way Bill Request ===");
        console.log("Auth Token:", authenticationToken);
        console.log("Month Year:", monthYear);
        console.log("E-way Bill Data:", JSON.stringify(ewaybillData, null, 2));

        // Make API call - Send ewaybillData directly in body
        const response = await axios.post(
            MICROVISTA_STANDALONE_EWAYBILL_URL,
            ewaybillData,
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "eWayBillUserName": eWayBillUserName,
                    "eWayBillPassword": eWayBillPassword,
                    "AuthenticationToken": authenticationToken,
                    "MonthYear": monthYear
                }
            }
        );

        const data = response.data;

        console.log("=== DEBUG: E-way Bill Response ===");
        console.log(JSON.stringify(data, null, 2));

        // Success - E-way Bills Generated
        if (data?.Status === "1" || data?.Status === 1) {
            return res.status(200).send({
                status: true,
                message: "E-way bill(s) generated successfully",
                authenticationToken: data.AuthenticationToken,
                results: data.lstEWBRes?.map((ewb: any) => ({
                    docNo: ewb.DocNo,
                    ewbNo: ewb.ewayBillNo,
                    ewbDate: ewb.ewayBillDate,
                    validUpto: ewb.validUpto,
                    distance: ewb.distance,
                    message: ewb.Message,
                    success: ewb.ewayBillNo > 0
                })) || [],
                raw: data
            });
        }

        // ❌ Failure - Data Errors
        return res.status(400).send({
            status: false,
            message: data?.Message || "Failed to generate e-way bill",
            errors: data?.Result?.Response?.map((err: any) => ({
                rowNo: err.RowNo,
                columnName: err.ColumnName,
                cellValue: err.CellValue,
                errorInfo: err.ErrorInfo
            })) || [],
            raw: data
        });

    } catch (err: any) {
        console.error("=== DEBUG: Error ===");
        console.error(err.response?.data || err.message);

        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista Standalone E-way Bill API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_CANCEL_BULK_EWAYBILL_URL =
    "http://powergstservice.microvistatech.com/Api/MVEWBAuthenticate/MVCancelEWB";

router.post("/api/microvista/cancel-bulk-ewaybills", async (req, res) => {
    try {
        const { authenticationToken, cancelItems } = req.body;

        // Validate required fields
        if (!authenticationToken || !cancelItems || !Array.isArray(cancelItems)) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authenticationToken or cancelItems (must be an array)"
            });
        }

        // Validate each cancel item
        for (const item of cancelItems) {
            if (!item.eWayBillNo || !item.CanReasonCode || !item.CanRemark) {
                return res.status(400).send({
                    status: false,
                    message: "Each cancel item must have: eWayBillNo, CanReasonCode, and CanRemark"
                });
            }
        }

        // Credentials
        const MVApiKey = "IPSZfNmcQCUNMfx";
        const MVSecretKey = "NyWQEq+4YWungcL1hfzGQA==";
        const gstin = "24AAAPI3182M002";
        const eWayBillUserName = "test_24_001";
        const eWayBillPassword = "Trial63$value";

        // Make API call
        const response = await axios.post(
            MICROVISTA_CANCEL_BULK_EWAYBILL_URL,
            {
                CancelItem: cancelItems
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "eWayBillUserName": eWayBillUserName,
                    "eWayBillPassword": eWayBillPassword,
                    "AuthenticationToken": authenticationToken
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === "1" || data?.Status === 1) {
            return res.status(200).send({
                status: true,
                message: "E-way bill cancellation processed",
                authenticationToken: data.AuthenticationToken,
                results: data.lstEWBCancelResponse?.map((result: any) => ({
                    ewbNo: result.ewayBillNo,
                    cancelDate: result.cancelDate,
                    message: result.Message,
                    success: result.cancelDate !== null
                })) || [],
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.Message || "Failed to cancel e-way bills",
            errors: data?.Result?.Response?.map((err: any) => ({
                rowNo: err.RowNo,
                columnName: err.ColumnName,
                cellValue: err.CellValue,
                errorInfo: err.ErrorInfo
            })) || [],
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista Cancel E-way Bills API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_UPDATE_PARTB_URL =
    "http://powergstservice.microvistatech.com/Api/MVEWBAuthenticate/MVUpdatePartBToEWB";

router.post("/api/microvista/update-partb-ewaybill", async (req, res) => {
    try {
        const { authenticationToken, updateItems } = req.body;

        // Validate required fields
        if (!authenticationToken || !updateItems || !Array.isArray(updateItems)) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authenticationToken or updateItems (must be an array)"
            });
        }

        // Validate each update item
        for (const item of updateItems) {
            if (!item.EWBNo || !item.TransMode || !item.PlaceofChange || !item.TransportationReason) {
                return res.status(400).send({
                    status: false,
                    message: "Each update item must have: EWBNo, TransMode, PlaceofChange, and TransportationReason"
                });
            }

            // Validate VehicleNo for Road transport
            if (item.TransMode === "1" && !item.VehicleNo) {
                return res.status(400).send({
                    status: false,
                    message: "VehicleNo is mandatory when TransMode is Road (1)"
                });
            }

            // Validate TransDocNo and TransDate for Rail/Air/Ship
            if (["2", "3", "4"].includes(item.TransMode) && (!item.TransDocNo || !item.TransDate)) {
                return res.status(400).send({
                    status: false,
                    message: "TransDocNo and TransDate are mandatory when TransMode is Rail/Air/Ship (2/3/4)"
                });
            }

            // Validate Remark for Others reason
            if (item.TransportationReason === "3" && !item.Remark) {
                return res.status(400).send({
                    status: false,
                    message: "Remark is mandatory when TransportationReason is Others (3)"
                });
            }
        }

        // Credentials
        const MVApiKey = "IPSZfNmcQCUNMfx";
        const MVSecretKey = "NyWQEq+4YWungcL1hfzGQA==";
        const gstin = "24AAAPI3182M002";
        const eWayBillUserName = "test_24_001";
        const eWayBillPassword = "Trial63$value";

        // Make API call
        const response = await axios.post(
            MICROVISTA_UPDATE_PARTB_URL,
            {
                UpdatePartBItem: updateItems
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "eWayBillUserName": eWayBillUserName,
                    "eWayBillPassword": eWayBillPassword,
                    "AuthenticationToken": authenticationToken
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === "1" || data?.Status === 1) {
            return res.status(200).send({
                status: true,
                message: "Part-B update processed",
                authenticationToken: data.AuthenticationToken,
                results: data.lstEWBUpdatePartBResponse?.map((result: any) => ({
                    ewbNo: result.EwayBillNo,
                    vehicleUpdateDate: result.VehicleUpdationDate,
                    validUpto: result.ValidUpto,
                    message: result.Message,
                    success: result.VehicleUpdationDate !== null
                })) || [],
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.Message || "Failed to update Part-B",
            errors: data?.Result?.Response?.map((err: any) => ({
                rowNo: err.RowNo,
                columnName: err.ColumnName,
                cellValue: err.CellValue,
                errorInfo: err.ErrorInfo
            })) || [],
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista Update Part-B API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_UPDATE_TRANSPORTER_URL =
    "http://powergstservice.microvistatech.com/Api/MVEWBAuthenticate/MVUpdateTransporterIdToEWB";

router.post("/api/microvista/update-transporter-ewaybill", async (req, res) => {
    try {
        const { authenticationToken, updateItems } = req.body;

        // Validate required fields
        if (!authenticationToken || !updateItems || !Array.isArray(updateItems)) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authenticationToken or updateItems (must be an array)"
            });
        }

        // Validate each update item
        for (const item of updateItems) {
            if (!item.ewbNo || !item.transporterId) {
                return res.status(400).send({
                    status: false,
                    message: "Each update item must have: ewbNo and transporterId"
                });
            }
        }

        // Credentials
        const MVApiKey = "IPSZfNmcQCUNMfx";
        const MVSecretKey = "NyWQEq+4YWungcL1hfzGQA==";
        const gstin = "24AAAPI3182M002";
        const eWayBillUserName = "test_24_001";
        const eWayBillPassword = "Trial63$value";

        // Make API call
        const response = await axios.post(
            MICROVISTA_UPDATE_TRANSPORTER_URL,
            {
                UpdateTransporterIdItem: updateItems
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "eWayBillUserName": eWayBillUserName,
                    "eWayBillPassword": eWayBillPassword,
                    "AuthenticationToken": authenticationToken
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === "1" || data?.Status === 1) {
            return res.status(200).send({
                status: true,
                message: "Transporter ID update processed",
                authenticationToken: data.AuthenticationToken,
                results: data.lstEWBUpdateTransporterIdResponse?.map((result: any) => ({
                    ewbNo: result.EwayBillNo,
                    transporterId: result.transporterId,
                    updateDate: result.updTransporterDate,
                    message: result.Message,
                    success: result.updTransporterDate !== null
                })) || [],
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.Message || "Failed to update transporter ID",
            errors: data?.Result?.Response?.map((err: any) => ({
                rowNo: err.RowNo,
                columnName: err.ColumnName,
                cellValue: err.CellValue,
                errorInfo: err.ErrorInfo
            })) || [],
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista Update Transporter ID API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_EXTEND_EWB_URL =
    "http://powergstservice.microvistatech.com/Api/MVEWBAuthenticate/MVExtendEWB";

router.post("/api/microvista/extend-ewaybill", async (req, res) => {
    try {
        const { authenticationToken, extendItems } = req.body;

        // ✅ Basic validation
        if (!authenticationToken || !Array.isArray(extendItems) || !extendItems.length) {
            return res.status(400).send({
                status: false,
                message: "authenticationToken and extendItems (array) are required"
            });
        }

        // ✅ Validate each EWB item
        for (const item of extendItems) {
            const requiredFields = [
                "ewbNo",
                "vehicleNo",
                "fromPlace",
                "fromState",
                "remainingDistance",
                "transDocNo",
                "transDocDate",
                "transMode",
                "extnRsnCode",
                "extnRemarks"
            ];

            for (const field of requiredFields) {
                if (!item[field]) {
                    return res.status(400).send({
                        status: false,
                        message: `Missing required field: ${field}`,
                        ewbNo: item.ewbNo || null
                    });
                }
            }
        }

        // 🔐 Microvista credentials
        const headers = {
            "Content-Type": "application/json",
            MVApiKey: "IPSZfNmcQCUNMfx",
            MVSecretKey: "NyWQEq+4YWungcL1hfzGQA==",
            GSTIN: "24AAAPI3182M002",
            eWayBillUserName: "test_24_001",
            eWayBillPassword: "Trial63$value",
            AuthenticationToken: authenticationToken
        };

        // 📡 Call Microvista API
        const response = await axios.post(
            MICROVISTA_EXTEND_EWB_URL,
            { ExtendItem: extendItems },
            { headers }
        );

        const data = response.data;

        // 🔍 Data-level error (Status = 0)
        if (data?.Status === "0") {
            return res.status(400).send({
                status: false,
                message: data.Message || "Invalid data",
                errors:
                    data?.Result?.Response?.map((err: any) => ({
                        ewbNo: err.RowNo,
                        columnName: err.ColumnName,
                        cellValue: err.CellValue,
                        errorInfo: err.ErrorInfo
                    })) || [],
                raw: data
            });
        }

        // ✅ Row-level results
        const results =
            data?.lstEWBExtendResponse?.map((r: any) => ({
                ewbNo: r.ewayBillNo,
                extendedDate: r.extendedDate,
                validUpto: r.validUpto,
                message: r.Message,
                success: !!r.extendedDate
            })) || [];

        const hasAnySuccess = results.some((r: any) => r.success);

        return res.status(hasAnySuccess ? 200 : 400).send({
            status: hasAnySuccess,
            message: hasAnySuccess
                ? "E-Way Bill validity extended (partial/full)"
                : "E-Way Bill validity extension failed",
            authenticationToken: data.AuthenticationToken,
            results,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while extending E-Way Bill validity",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_INIT_MULTI_VEH_URL =
    "http://powergstservice.microvistatech.com/Api/MVEWBAuthenticate/MVIniMulVehEWB";

router.post("/api/microvista/initiate-multi-vehicle-ewb", async (req, res) => {
    try {
        const { authenticationToken, iniMulVehItems } = req.body;

        // ✅ Basic validation
        if (!authenticationToken || !Array.isArray(iniMulVehItems) || !iniMulVehItems.length) {
            return res.status(400).send({
                status: false,
                message: "authenticationToken and iniMulVehItems (array) are required"
            });
        }

        // ✅ Validate each item
        for (const item of iniMulVehItems) {
            const requiredFields = [
                "ewbNo",
                "reasonCode",
                "reasonRem",
                "fromPlace",
                "fromState",
                "toPlace",
                "toState",
                "transMode",
                "totalQuantity",
                "unitCode"
            ];

            for (const field of requiredFields) {
                if (item[field] === undefined || item[field] === null || item[field] === "") {
                    return res.status(400).send({
                        status: false,
                        message: `Missing required field: ${field}`,
                        ewbNo: item.ewbNo || null
                    });
                }
            }
        }

        // 🔐 Microvista headers
        const headers = {
            "Content-Type": "application/json",
            MVApiKey: "IPSZfNmcQCUNMfx",
            MVSecretKey: "NyWQEq+4YWungcL1hfzGQA==",
            GSTIN: "24AAAPI3182M002",
            eWayBillUserName: "test_24_001",
            eWayBillPassword: "Trial63$value",
            AuthenticationToken: authenticationToken
        };

        // 📡 API call
        const response = await axios.post(
            MICROVISTA_INIT_MULTI_VEH_URL,
            {
                IniMulVehItem: iniMulVehItems.map((item: any) => ({
                    ewbNo: Number(item.ewbNo),
                    reasonCode: Number(item.reasonCode),
                    reasonRem: item.reasonRem,
                    fromPlace: item.fromPlace,
                    fromState: Number(item.fromState),
                    toPlace: item.toPlace,
                    toState: Number(item.toState),
                    transMode: Number(item.transMode),
                    totalQuantity: Number(item.totalQuantity),
                    unitCode: item.unitCode
                }))
            },
            { headers }
        );

        const data = response.data;

        // ❌ Data-level error (Status = 0)
        if (data?.Status === "0") {
            return res.status(400).send({
                status: false,
                message: data.Message || "Invalid Data",
                errors:
                    data?.Result?.Response?.map((err: any) => ({
                        ewbNo: err.RowNo,
                        columnName: err.ColumnName,
                        cellValue: err.CellValue,
                        errorInfo: err.ErrorInfo
                    })) || [],
                raw: data
            });
        }

        // ✅ Row-level results
        const results =
            data?.lstEWBIniMulVehResponse?.map((r: any) => ({
                ewbNo: r.ewbNo,
                groupNo: r.groupNo,
                groupReferenceId: r.groupReferenceId,
                createdDate: r.createdDate,
                message: r.Message,
                success: !!r.groupNo
            })) || [];

        const hasAnySuccess = results.some((r: any) => r.success);

        return res.status(hasAnySuccess ? 200 : 400).send({
            status: hasAnySuccess,
            message: hasAnySuccess
                ? "Multi vehicle movement initiated successfully"
                : "Multi vehicle movement initiation failed",
            authenticationToken: data.AuthenticationToken,
            results,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while initiating multi vehicle movement",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_ADD_MULTI_VEH_URL =
    "http://powergstservice.microvistatech.com/Api/MVEWBAuthenticate/MVAddMulVehEWB";

router.post("/api/microvista/add-multi-vehicle-ewb", async (req, res) => {
    try {
        const { authenticationToken, addMulVehItems } = req.body;

        // ✅ Basic validation
        if (
            !authenticationToken ||
            !Array.isArray(addMulVehItems) ||
            !addMulVehItems.length
        ) {
            return res.status(400).send({
                status: false,
                message: "authenticationToken and addMulVehItems (array) are required"
            });
        }

        // ✅ Validate each item
        for (const item of addMulVehItems) {
            const requiredFields = [
                "ewbNo",
                "groupNo",
                "vehicleNo",
                "transDocNo",
                "transDocDate",
                "quantity",
                "groupReferenceId"
            ];

            for (const field of requiredFields) {
                if (item[field] === undefined || item[field] === null || item[field] === "") {
                    return res.status(400).send({
                        status: false,
                        message: `Missing required field: ${field}`,
                        ewbNo: item.ewbNo || null
                    });
                }
            }
        }

        // 🔐 Microvista headers
        const headers = {
            "Content-Type": "application/json",
            MVApiKey: "IPSZfNmcQCUNMfx",
            MVSecretKey: "NyWQEq+4YWungcL1hfzGQA==",
            GSTIN: "24AAAPI3182M002",
            eWayBillUserName: "test_24_001",
            eWayBillPassword: "Trial63$value",
            AuthenticationToken: authenticationToken
        };

        // 📡 API call
        const response = await axios.post(
            MICROVISTA_ADD_MULTI_VEH_URL,
            {
                AddMulVehItem: addMulVehItems.map((item: any) => ({
                    ewbNo: Number(item.ewbNo),
                    groupNo: String(item.groupNo),
                    vehicleNo: item.vehicleNo,
                    transDocNo: item.transDocNo,
                    transDocDate: item.transDocDate, // DD/MM/YYYY
                    quantity: Number(item.quantity),
                    groupReferenceId: Number(item.groupReferenceId)
                }))
            },
            { headers }
        );

        const data = response.data;

        // ❌ Data-level error (Status = 0)
        if (data?.Status === "0") {
            return res.status(400).send({
                status: false,
                message: data.Message || "Invalid Data",
                errors:
                    data?.Result?.Response?.map((err: any) => ({
                        ewbNo: err.RowNo,
                        columnName: err.ColumnName,
                        cellValue: err.CellValue,
                        errorInfo: err.ErrorInfo
                    })) || [],
                raw: data
            });
        }

        // ✅ Row-level results
        const results =
            data?.lstEWBAddMulVehResponse?.map((r: any) => ({
                ewbNo: r.ewbNo,
                groupNo: r.groupNo,
                vehicleNo: r.vehicleNo,
                vehAddedDate: r.vehAddedDate,
                message: r.Message,
                success: !!r.groupNo
            })) || [];

        const hasAnySuccess = results.some((r: any) => r.success);

        return res.status(hasAnySuccess ? 200 : 400).send({
            status: hasAnySuccess,
            message: hasAnySuccess
                ? "Vehicle added successfully for multi vehicle movement"
                : "Add multi vehicle movement failed",
            authenticationToken: data.AuthenticationToken,
            results,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while adding multi vehicle movement",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_REJECT_EWB_URL =
    "http://powergstservice.microvistatech.com/Api/MVEWBAuthenticate/MVRejectEWB";

router.post("/api/microvista/reject-ewb", async (req, res) => {
    try {
        const { authenticationToken, rejectItems } = req.body;

        // ✅ Basic validation
        if (
            !authenticationToken ||
            !Array.isArray(rejectItems) ||
            !rejectItems.length
        ) {
            return res.status(400).send({
                status: false,
                message: "authenticationToken and rejectItems (array) are required"
            });
        }

        // ✅ Validate each item
        for (const item of rejectItems) {
            if (!item.ewbNo) {
                return res.status(400).send({
                    status: false,
                    message: "Missing required field: ewbNo",
                    ewbNo: null
                });
            }
        }

        // 🔐 Microvista headers
        const headers = {
            "Content-Type": "application/json",
             MVApiKey: "IPSZfNmcQCUNMfx",
            MVSecretKey: "NyWQEq+4YWungcL1hfzGQA==",
            gstin: "24AAAPI3182M002",
            eWayBillUserName: "test_24_001",
            eWayBillPassword: "Trial63$value",
            AuthenticationToken: authenticationToken
        };

        // 📡 API call
        const response = await axios.post(
            MICROVISTA_REJECT_EWB_URL,
            {
                RejectItem: rejectItems.map((item: any) => ({
                    ewbNo: String(item.ewbNo)
                }))
            },
            { headers }
        );

        const data = response.data;

        // ❌ Data-level error (Status = 0)
        if (data?.Status === "0") {
            return res.status(400).send({
                status: false,
                message: data.Message || "Invalid Data",
                errors:
                    data?.Result?.Response?.map((err: any) => ({
                        ewbNo: err.RowNo || null,
                        columnName: err.ColumnName,
                        cellValue: err.CellValue,
                        errorInfo: err.ErrorInfo
                    })) || [],
                raw: data
            });
        }

        // ✅ Row-level results
        const results =
            data?.lstEWBRejectResponse?.map((r: any) => ({
                ewbNo: r.ewayBillNo,
                rejectedDate: r.ewbRejectedDate,
                message: r.Message,
                success:
                    typeof r.Message === "string" &&
                    r.Message.toLowerCase().includes("successfully")
            })) || [];

        const hasAnySuccess = results.some((r: any) => r.success);

        return res.status(hasAnySuccess ? 200 : 400).send({
            status: hasAnySuccess,
            message: hasAnySuccess
                ? "E-Way Bill rejected successfully"
                : "E-Way Bill rejection failed",
            authenticationToken: data.AuthenticationToken,
            results,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while rejecting E-Way Bill",
            error: err.response?.data || err.message
        });
    }
});

export default router;
