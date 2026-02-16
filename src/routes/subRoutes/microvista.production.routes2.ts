import express from "express";
const router = express.Router();
import axios from "axios";
import QRCode from "qrcode";

// ================ MICROVISTA E-INVOICE ROUTES ================

const MICROVISTA_AUTH_URL =
    "https://www.ewaybills.com/MVEINVAuthenticate/EINVAuthentication";

router.post("/api/microvista/production-generate-irn-auth-token", async (req, res) => {
    try {
        const authPayload = {
            MVApiKey: "v4uuPlRON2SJDFn",
            MVSecretKey: "k+QCsQ82OMMsoPSjvkO/cw==",
            gstin: '19ABCCA1254E1Z1',
            eInvoiceUserName: 'Dharmik123_API_AAR',
            eInvoicePassword: 'Aarihant@12344'
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
    "https://www.ewaybills.com/MVEINVAuthenticate/EINVGeneration";

router.post("/api/microvista/production-generate-irn", async (req, res) => {
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
    "https://www.ewaybills.com/MVEINVAuthenticate/EINVGetIRNDetails";

router.post("/api/microvista/production-get-irn-details", async (req, res) => {
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
    "https://www.ewaybills.com/MVEINVAuthenticate/EINVEwaybillByIRN";

router.post("/api/microvista/production-generate-ewaybill-by-irn", async (req, res) => {
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
router.post("/api/microvista/production-decode-invoice", async (req, res) => {
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
router.post("/api/microvista/production-generate-qr-image", async (req, res) => {
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
    "https://www.ewaybills.com/MVEINVAuthenticate/EINVCancelIRN";

router.post("/api/microvista/production-cancel-irn", async (req, res) => {
    try {
        const { authToken, Irn, CnlRsn, CnlRem } = req.body;

        // Validate required fields
        if (!authToken || !Irn || !CnlRsn || !CnlRem) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, Irn, CnlRsn, or CnlRem"
            });
        }

        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = '19ABCCA1254E1Z1';
        const eInvoiceUserName = 'Dharmik123_API_AAR';
        const eInvoicePassword = 'Aarihant@12344'


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
    "https://www.ewaybills.com/MVEINVAuthenticate/EINVCancelEWaybill";

router.post("/api/microvista/production-cancel-ewaybill", async (req, res) => {
    try {
        const { authToken, ewbNo, cancelRsnCode, cancelRmrk } = req.body;

        // Validate required fields
        if (!authToken || !ewbNo || !cancelRsnCode || !cancelRmrk) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, ewbNo, cancelRsnCode, or cancelRmrk"
            });
        }

        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = '19ABCCA1254E1Z1';
        const eInvoiceUserName = 'Dharmik123_API_AAR';
        const eInvoicePassword = 'Aarihant@12344'


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

const MICROVISTA_EWAYBILL_AUTH_URL = "https://www.ewaybills.com/MVEWBAuthenticate/MVAuthentication";

router.post("/api/microvista/production-generate-ewaybill-auth-token", async (req, res) => {
    try {
        const authPayload = {
            MVApiKey: "v4uuPlRON2SJDFn",
            MVSecretKey: "k+QCsQ82OMMsoPSjvkO/cw==",
            gstin: "19ABCCA1254E1Z1",
            eWayBillUserName: "Dharmik123_API_AAR",
            eWayBillPassword: "Aarihant@12344"
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
    "https://www.ewaybills.com/MVEWBAuthenticate/MVGenerationWithDist";

router.post("/api/microvista/production-generate-standalone-ewaybill", async (req, res) => {
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
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";
        const eWayBillUserName = "Dharmik123_API_AAR";
        const eWayBillPassword = "Aarihant@12344";

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
    "https://www.ewaybills.com/MVEWBAuthenticate/MVCancelEWB";

router.post("/api/microvista/production-cancel-bulk-ewaybills", async (req, res) => {
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
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";
        const eWayBillUserName = "Dharmik123_API_AAR";
        const eWayBillPassword = "Aarihant@12344";

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
    "https://www.ewaybills.com/MVEWBAuthenticate/MVUpdatePartBToEWB";

router.post("/api/microvista/production-update-partb-ewaybill", async (req, res) => {
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
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";
        const eWayBillUserName = "Dharmik123_API_AAR";
        const eWayBillPassword = "Aarihant@12344";

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
    "https://www.ewaybills.com/MVEWBAuthenticate/MVUpdateTransporterIdToEWB";

router.post("/api/microvista/production-update-transporter-ewaybill", async (req, res) => {
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
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";
        const eWayBillUserName = "Dharmik123_API_AAR";
        const eWayBillPassword = "Aarihant@12344";

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
    "https://www.ewaybills.com/MVEWBAuthenticate/MVExtendEWB";

router.post("/api/microvista/production-extend-ewaybill", async (req, res) => {
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
            MVApiKey: "v4uuPlRON2SJDFn",
            MVSecretKey: "k+QCsQ82OMMsoPSjvkO/cw==",
            GSTIN: "19ABCCA1254E1Z1",
            eWayBillUserName: "Dharmik123_API_AAR",
            eWayBillPassword: "Aarihant@12344",
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
    "https://www.ewaybills.com/MVEWBAuthenticate/MVIniMulVehEWB";

router.post("/api/microvista/production-initiate-multi-vehicle-ewb", async (req, res) => {
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
            MVApiKey: "v4uuPlRON2SJDFn",
            MVSecretKey: "k+QCsQ82OMMsoPSjvkO/cw==",
            GSTIN: "19ABCCA1254E1Z1",
            eWayBillUserName: "Dharmik123_API_AAR",
            eWayBillPassword: "Aarihant@12344",
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
    "https://www.ewaybills.com/MVEWBAuthenticate/MVAddMulVehEWB";

router.post("/api/microvista/production-add-multi-vehicle-ewb", async (req, res) => {
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
            MVApiKey: "v4uuPlRON2SJDFn",
            MVSecretKey: "k+QCsQ82OMMsoPSjvkO/cw==",
            GSTIN: "19ABCCA1254E1Z1",
            eWayBillUserName: "Dharmik123_API_AAR",
            eWayBillPassword: "Aarihant@12344",
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
    "https://www.ewaybills.com/MVEWBAuthenticate/MVRejectEWB ";

router.post("/api/microvista/production-reject-ewb", async (req, res) => {
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
            MVApiKey: "v4uuPlRON2SJDFn",
            MVSecretKey: "k+QCsQ82OMMsoPSjvkO/cw==",
            GSTIN: "19ABCCA1254E1Z1",
            eWayBillUserName: "Dharmik123_API_AAR",
            eWayBillPassword: "Aarihant@12344",
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

// =============== MICROVISTA E-WAY BILL ROUTES END ===============


// ==============GST APIs (GSTR1) ROUTES START==============

// SEND OTP API
const MICROVISTA_SEND_OTP_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGETOTP";
router.post("/api/microvista/production-gst-send-otp", async (req, res) => {
    try {
        const { gstUserName } = req.body;

        // Validate required field
        if (!gstUserName) {
            return res.status(400).send({
                status: false,
                message: "Missing required field: gstUserName"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_SEND_OTP_URL,
            {},
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "OTPREQUEST",
                    "GSTUserName": gstUserName
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: data.Message || "OTP sent successfully",
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.Message || "Failed to send OTP",
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista Send OTP API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GST_AUTH_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGSTAuthentication";
router.post("/api/microvista/production-gst-authentication", async (req, res) => {
    try {
        const { gstUserName, otp } = req.body;

        // Validate required fields
        if (!gstUserName || !otp) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: gstUserName or otp"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_GST_AUTH_URL,
            {},
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "AUTHTOKEN",
                    "GSTUserName": gstUserName,
                    "OTP": otp
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "Authentication successful",
                authToken: data.auth_token,
                expiry: data.expiry,
                sek: data.sek,
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Authentication failed",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista GST Authentication API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_REFRESH_TOKEN_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGSTRefreshToken";
router.post("/api/microvista/production-gst-refresh-token", async (req, res) => {
    try {
        const { gstUserName, authToken } = req.body;

        // Validate required fields
        if (!gstUserName || !authToken) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: gstUserName, authToken"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call with username in body
        const response = await axios.post(
            MICROVISTA_REFRESH_TOKEN_URL,
            {
                username: gstUserName  // Send username in request body
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "REFRESHTOKEN",
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "Auth token refreshed successfully",
                data: {
                    auth_token: data.auth_token,
                    expiry: data.expiry,
                    sek: data.sek
                },
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to refresh auth token",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista Refresh Token API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GSTR1_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGetGSTR1";
router.post("/api/microvista/production-get-gstr1", async (req, res) => {
    try {
        const { gstUserName, authToken, returnPeriod, action } = req.body;

        // Validate required fields
        if (!authToken || !returnPeriod) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken or returnPeriod"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_GSTR1_URL,
            {},
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": action || "B2B", // Default to B2B if not provided
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken,
                    "ReturnPeriod": returnPeriod
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "GSTR1 data fetched successfully",
                data: data,
                // raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to fetch GSTR1 data",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista GSTR1 API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GSTR2A_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGetGSTR2A";
router.post("/api/microvista/production-get-gstr2a", async (req, res) => {
    try {
        const { authToken, returnPeriod, action, gstUserName } = req.body;

        // Validate required fields
        if (!authToken || !returnPeriod) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken or returnPeriod"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_GSTR2A_URL,
            {},
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": action || "B2B", // Default to B2B if not provided
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken,
                    "ReturnPeriod": returnPeriod
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "GSTR2A data fetched successfully",
                data: data,
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to fetch GSTR2A data",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista GSTR2A API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GSTR2B_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGetGSTR2B";
router.post("/api/microvista/production-get-gstr2b", async (req, res) => {
    try {
        const { authToken, returnPeriod, fileNum, gstUserName } = req.body;

        // Validate required fields
        if (!authToken || !returnPeriod) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken or returnPeriod"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";
        // const gstUserName = "dharmik12344";

        // Build headers
        const headers: any = {
            "Content-Type": "application/json",
            "MVApiKey": MVApiKey,
            "MVSecretKey": MVSecretKey,
            "GSTIN": gstin,
            "Action": "GET2B",
            "GSTUserName": gstUserName,
            "AuthToken": authToken,
            "ReturnPeriod": returnPeriod
        };

        // Add File_Num only if provided (optional parameter)
        if (fileNum) {
            headers["File_Num"] = fileNum.toString();
        }

        // Make API call
        const response = await axios.post(
            MICROVISTA_GSTR2B_URL,
            {},
            { headers }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "GSTR2B data fetched successfully",
                data: data,
                // raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to fetch GSTR2B data",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista GSTR2B API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GSTR2X_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGSTR2XGetTdsTcsCreditDetails";
router.post("/api/microvista/production-get-gstr2x-tds-tcs", async (req, res) => {
    try {
        const { authToken, returnPeriod, recordType, fromTime, gstUserName } = req.body;

        // Validate required fields
        if (!authToken || !returnPeriod) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken or returnPeriod"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";
        // const gstUserName = "dharmik12344";

        // Build headers
        const headers: any = {
            "Content-Type": "application/json",
            "MVApiKey": MVApiKey,
            "MVSecretKey": MVSecretKey,
            "GSTIN": gstin,
            "Action": "TDSTCS",
            "GSTUserName": gstUserName,
            "AuthToken": authToken,
            "ReturnPeriod": returnPeriod
        };

        // Add optional parameters if provided
        if (recordType) {
            headers["RecordType"] = recordType; // Max length 4 (e.g., "TDC")
        }

        if (fromTime) {
            headers["FromTime"] = fromTime; // Format: DD-MM-YYYY HH:mm (e.g., "01-12-2025 00:00")
        }

        // Make API call
        const response = await axios.post(
            MICROVISTA_GSTR2X_URL,
            {},
            { headers }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "GSTR2X TDS-TCS credit details fetched successfully",
                data: data,
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to fetch GSTR2X TDS-TCS credit details",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista GSTR2X API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GSTR1_SAVE_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGSTR1Save";
router.post("/api/microvista/production-save-gstr1", async (req, res) => {
    try {
        const { authToken, returnPeriod, gstr1Data, gstUserName } = req.body;

        // Validate required fields
        if (!authToken || !returnPeriod || !gstr1Data || !gstUserName) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, returnPeriod, gstUserName or gstr1Data"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";
        // const gstUserName = "dharmik12344";

        // Make API call
        const response = await axios.post(
            MICROVISTA_GSTR1_SAVE_URL,
            gstr1Data, // The actual GSTR1 data payload
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "RETSAVE",
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken,
                    "ReturnPeriod": returnPeriod
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "GSTR1 data saved successfully",
                data: data,
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to save GSTR1 data",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista GSTR1 Save API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GSTR1_SUBMIT_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGSTR1Submit";
router.post("/api/microvista/production-submit-gstr1", async (req, res) => {
    try {
        const { gstUserName, authToken, returnPeriod } = req.body;

        // Validate required fields
        if (!authToken || !returnPeriod || !gstUserName) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, gstUserName or returnPeriod"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";
        // const gstUserName = "dharmik12344";

        // Make API call
        const response = await axios.post(
            MICROVISTA_GSTR1_SUBMIT_URL,
            {}, // Empty body as per documentation
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "RETSUBMIT",
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken,
                    "ReturnPeriod": returnPeriod
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "GSTR1 submitted successfully",
                data: data,
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to submit GSTR1",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista GSTR1 Submit API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GSTR1_SUMMARY_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGetGSTR1Summary";
router.post("/api/microvista/production-get-gstr1-summary", async (req, res) => {
    try {
        const { authToken, returnPeriod, gstUserName } = req.body;

        // Validate required fields
        if (!authToken || !returnPeriod || !gstUserName) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, returnPeriod, or gstUserName"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_GSTR1_SUMMARY_URL,
            {},
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "RETSUM",
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken,
                    "ReturnPeriod": returnPeriod
                }
            }
        );

        const data = response.data;

        // ✅ Success - Check if we have sec_sum data (even with Status: 0)
        if (data?.sec_sum && Array.isArray(data.sec_sum)) {
            return res.status(200).send({
                status: true,
                message: "GSTR1 summary fetched successfully",
                summary: data,
                gstin: data.gstin,
                returnPeriod: data.ret_period,
                sections: data.sec_sum,
                // raw: data
            });
        }

        // ❌ Failure - Only if no data or error message
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || data?.error_message || "Failed to fetch GSTR1 summary or no data available",
            errorCode: data?.ErrorCode || data?.error_cd,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista GSTR1 Summary API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GSTR1_FILE_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGSTR1File";
router.post("/api/microvista/production-file-gstr1", async (req, res) => {
    try {
        const { authToken, returnPeriod, gstUserName } = req.body;

        // Validate required fields
        if (!authToken || !returnPeriod || !gstUserName) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, returnPeriod, or gstUserName"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_GSTR1_FILE_URL,
            {}, // Empty body as per documentation
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "RETFILE",
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken,
                    "ReturnPeriod": returnPeriod
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "GSTR1 filed successfully",
                acknowledgementNumber: data.ack_num,
                data: data,
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to file GSTR1",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista GSTR1 File API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_CASH_LEDGER_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGetCashLedgerDetail";
router.post("/api/microvista/production-get-cash-ledger", async (req, res) => {
    try {
        const { authToken, returnPeriod, gstUserName, fromDate, toDate } = req.body;

        // Validate required fields
        if (!authToken || !returnPeriod || !gstUserName || !fromDate || !toDate) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, returnPeriod, gstUserName, fromDate, or toDate"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_CASH_LEDGER_URL,
            {},
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "CASH",
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken,
                    "ReturnPeriod": returnPeriod,
                    "FromDate": fromDate, // Format: DD-MM-YYYY
                    "ToDate": toDate       // Format: DD-MM-YYYY
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "Cash ledger details fetched successfully",
                data: data,
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to fetch cash ledger details",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista Cash Ledger API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_ITC_LEDGER_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGetITCLedgerDetail";
router.post("/api/microvista/production-get-itc-ledger", async (req, res) => {
    try {
        const { authToken, returnPeriod, gstUserName, fromDate, toDate } = req.body;

        // Validate required fields
        if (!authToken || !returnPeriod || !gstUserName || !fromDate || !toDate) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, returnPeriod, gstUserName, fromDate, or toDate"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_ITC_LEDGER_URL,
            {},
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "ITC",
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken,
                    "ReturnPeriod": returnPeriod,
                    "FromDate": fromDate, // Format: DD-MM-YYYY
                    "ToDate": toDate       // Format: DD-MM-YYYY
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "ITC ledger details fetched successfully",
                data: data,
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to fetch ITC ledger details",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista ITC Ledger API",
            error: err.response?.data || err.message
        });
    }
});

// This below api not working properly
const MICROVISTA_LIABILITY_LEDGER_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGetLiabilityLedgerDetail";
router.post("/api/microvista/production-get-liability-ledger", async (req, res) => {
    try {
        const { authToken, gstUserName, fromDate, toDate } = req.body;

        // Validate required fields
        if (!authToken || !gstUserName || !fromDate || !toDate) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, gstUserName, fromDate, or toDate"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_LIABILITY_LEDGER_URL,
            {},
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "TAX",
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken,
                    "FromDate": fromDate, // Format: DD-MM-YYYY
                    "ToDate": toDate       // Format: DD-MM-YYYY
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "Liability ledger details fetched successfully",
                data: data,
                // raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to fetch liability ledger details",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista Liability Ledger API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_ITC_BALANCE_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGetITCBalance";
router.post("/api/microvista/production-get-itc-balance", async (req, res) => {
    try {
        const { authToken, returnPeriod, gstUserName } = req.body;

        // Validate required fields
        if (!authToken || !returnPeriod || !gstUserName) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, returnPeriod, or gstUserName"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_ITC_BALANCE_URL,
            {},
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "BAL",
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken,
                    "ReturnPeriod": returnPeriod
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "Cash and ITC balance fetched successfully",
                balance: data,
                // raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to fetch Cash and ITC balance",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista ITC Balance API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GET_PREFERENCE_URL = "https://www.ewaybills.com/MVGSTAPI/MVGetAllPreference";
router.post("/api/microvista/production-get-all-preference", async (req, res) => {
    try {
        const { authToken, gstUserName, financialYear } = req.body;

        // Validate required fields
        if (!authToken || !gstUserName || !financialYear) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, gstUserName, or financialYear"
            });
        }

        // Validate financial year format (YYYY-YY)
        const fyRegex = /^\d{4}-\d{2}$/;
        if (!fyRegex.test(financialYear)) {
            return res.status(400).send({
                status: false,
                message: "Invalid financial year format. Use YYYY-YY (e.g., 2024-25)"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_GET_PREFERENCE_URL,
            {},
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "GETPREF",
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken,
                    "FinancialYear": financialYear // Format: YYYY-YY (e.g., 2024-25)
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "Preferences fetched successfully",
                preferences: data,
                // raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to fetch preferences",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista Get Preference API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GET_OTHER_PREFERENCE_URL = "https://www.ewaybills.com/MVGSTAPI/MVGetOtherPreference";
router.post("/api/microvista/production-get-other-party-preference", async (req, res) => {
    try {
        const { toGSTIN, financialYear } = req.body;

        // Validate required fields
        if (!toGSTIN || !financialYear) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: toGSTIN or financialYear"
            });
        }

        // Validate GSTIN format (15 characters alphanumeric)
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinRegex.test(toGSTIN)) {
            return res.status(400).send({
                status: false,
                message: "Invalid ToGSTIN format. Must be 15 characters (e.g., 27AAPFU0939F1ZV)"
            });
        }

        // Validate financial year format (YYYY-YY)
        const fyRegex = /^\d{4}-\d{2}$/;
        if (!fyRegex.test(financialYear)) {
            return res.status(400).send({
                status: false,
                message: "Invalid financial year format. Use YYYY-YY (e.g., 2024-25)"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_GET_OTHER_PREFERENCE_URL,
            {},
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "GETPREF",
                    "ToGSTIN": toGSTIN,           // Other party's GSTIN
                    "FinancialYear": financialYear // Format: YYYY-YY (e.g., 2024-25)
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "Other party preferences fetched successfully",
                toGSTIN: toGSTIN,
                preferences: data,
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to fetch other party preferences",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista Get Other Party Preference API",
            error: err.response?.data || err.message
        });
    }
});

// This below api not working properly
const MICROVISTA_SAVE_PREFERENCE_URL = "https://www.ewaybills.com/MVGSTAPI/MVSavePreference";
router.post("/api/microvista/production-gst-save-preference", async (req, res) => {
    try {
        const { authToken, gstUserName, financialYear, preferenceData } = req.body;

        // Validate required fields
        if (!authToken || !gstUserName || !financialYear || !preferenceData) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, gstUserName, financialYear, or preferenceData"
            });
        }

        // Validate preference data structure
        if (!preferenceData.gstin || !preferenceData.fy || !preferenceData.quarter || !preferenceData.preference) {
            return res.status(400).send({
                status: false,
                message: "Invalid preferenceData. Required fields: gstin, fy, quarter, preference"
            });
        }

        // Validate financial year format (YYYY-YY)
        const fyRegex = /^\d{4}-\d{2}$/;
        if (!fyRegex.test(financialYear) || !fyRegex.test(preferenceData.fy)) {
            return res.status(400).send({
                status: false,
                message: "Invalid financial year format. Use YYYY-YY (e.g., 2024-25)"
            });
        }

        // Validate quarter
        const validQuarters = ["Q1", "Q2", "Q3", "Q4"];
        if (!validQuarters.includes(preferenceData.quarter)) {
            return res.status(400).send({
                status: false,
                message: "Invalid quarter. Must be Q1, Q2, Q3, or Q4"
            });
        }

        // Validate preference type
        const validPreferences = ["Q", "M"]; // Q = Quarterly, M = Monthly
        if (!validPreferences.includes(preferenceData.preference)) {
            return res.status(400).send({
                status: false,
                message: "Invalid preference. Must be 'Q' (Quarterly) or 'M' (Monthly)"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_SAVE_PREFERENCE_URL,
            preferenceData,
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "GETPREF",
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken,
                    "FinancialYear": financialYear
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1" || data?.status_cd === "1") {
            return res.status(200).send({
                status: true,
                message: "Preference saved successfully",
                data: data,
                // raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to save preference",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista Save Preference API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GSTR3B_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGetGSTR3B";
router.post("/api/microvista/production-get-gst-gstr3b", async (req, res) => {
    try {
        const { authToken, returnPeriod, gstUserName } = req.body;

        // Validate required fields
        if (!authToken || !returnPeriod || !gstUserName) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, returnPeriod, or gstUserName"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_GSTR3B_URL,
            {},
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "RETSUM",
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken,
                    "ReturnPeriod": returnPeriod
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "GSTR3B data fetched successfully",
                data: data,
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to fetch GSTR3B data",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista GSTR3B API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GSTR3B_SAVE_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGSTR3BSave";
router.post("/api/microvista/production-save-gstr3b", async (req, res) => {
    try {
        const { authToken, returnPeriod, gstUserName, gstr3bData } = req.body;

        // Validate required fields
        if (!authToken || !returnPeriod || !gstUserName || !gstr3bData) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, returnPeriod, gstUserName, or gstr3bData"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_GSTR3B_SAVE_URL,
            gstr3bData, // The actual GSTR3B data payload
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "RETSAVE",
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken,
                    "ReturnPeriod": returnPeriod
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "GSTR3B saved successfully",
                referenceId: data.reference_id,
                data: data,
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to save GSTR3B",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista GSTR3B Save API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GSTR3B_OFFSET_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGSTR3BRTNOFFSET";
router.post("/api/microvista/production-offset-gstr3b-liability", async (req, res) => {
    try {
        const { authToken, returnPeriod, gstUserName, offsetData } = req.body;

        // Validate required fields
        if (!authToken || !returnPeriod || !gstUserName || !offsetData) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, returnPeriod, gstUserName, or offsetData"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_GSTR3B_OFFSET_URL,
            offsetData, // The offset liability data payload
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "RETOFFSET",
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken,
                    "ReturnPeriod": returnPeriod
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: data.message || "Payment of tax successfully done",
                data: data,
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to offset liability",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista GSTR3B Offset Liability API",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GSTR3B_FILE_URL = "https://www.ewaybills.com/MVGSTAPI/MVENCGSTR3BFile";
router.post("/api/microvista/production-file-gstr3b", async (req, res) => {
    try {
        const { authToken, returnPeriod, gstUserName } = req.body;

        // Validate required fields
        if (!authToken || !returnPeriod || !gstUserName) {
            return res.status(400).send({
                status: false,
                message: "Missing required fields: authToken, returnPeriod, or gstUserName"
            });
        }

        // Credentials
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        const gstin = "19ABCCA1254E1Z1";

        // Make API call
        const response = await axios.post(
            MICROVISTA_GSTR3B_FILE_URL,
            {}, // Empty body as per documentation
            {
                headers: {
                    "Content-Type": "application/json",
                    "MVApiKey": MVApiKey,
                    "MVSecretKey": MVSecretKey,
                    "GSTIN": gstin,
                    "Action": "RETFILE",
                    "GSTUserName": gstUserName,
                    "AuthToken": authToken,
                    "ReturnPeriod": returnPeriod
                }
            }
        );

        const data = response.data;

        // ✅ Success
        if (data?.Status === 1 || data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "GSTR3B filed successfully",
                acknowledgementNumber: data.ack_num,
                data: data,
                raw: data
            });
        }

        // ❌ Failure
        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to file GSTR3B",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling Microvista GSTR3B File API",
            error: err.response?.data || err.message
        });
    }
});
export default router;
