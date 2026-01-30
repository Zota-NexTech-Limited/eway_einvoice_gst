import axios from "axios";
import express from "express";

const router = express.Router();

const MICROVISTA_SEND_OTP_URL =
    "https://www.ewaybills.com/MVGSTAPI/MVENCGETOTP";

router.post("/api/microvista/production/get/send-otp", async (req, res) => {
    try {
        const { gstUserName } = req.body;

        // ✅ Basic validation
        if (!gstUserName) {
            return res.status(400).send({
                status: false,
                message: "gstUserName is required"
            });
        }

        // 🔐 Microvista headers (as per document)
        const headers = {
            "Content-Type": "application/json",
            MVApiKey: "v4uuPlRON2SJDFn",              // Provided by Microvista
            MVSecretKey: "k+QCsQ82OMMsoPSjvkO/cw==",  // Encrypted secret
            GSTIN: "19ABCCA1254E1Z1",                 // Your GSTIN
            Action: "OTPREQUEST",
            GSTUserName: gstUserName
        };

        // 📡 API call (POST with empty body)
        const response = await axios.post(
            MICROVISTA_SEND_OTP_URL,
            {},
            { headers }
        );

        const data = response.data;

        // ❌ OTP failure
        if (data?.Status === 0 || data?.Status === "0") {
            return res.status(400).send({
                status: false,
                message: data.Message || "OTP request failed",
                raw: data
            });
        }

        // ✅ OTP success
        return res.status(200).send({
            status: true,
            message: data.Message || "OTP sent successfully",
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while sending OTP",
            error: err.response?.data || err.message
        });
    }
});

// EINVOICE====
const MICROVISTA_EINV_AUTH_URL =
    "https://www.ewaybills.com/MVEINVAuthenticate/EINVAuthentication";

router.post("/api/microvista/production/einvoice/auth-token", async (req, res) => {
    try {

        // 📦 Authentication request body (as per Microvista doc)
        const requestBody = {
            MVApiKey: "v4uuPlRON2SJDFn",
            MVSecretKey: "k+QCsQ82OMMsoPSjvkO/cw==",
            gstin: '19ABCCA1254E1Z1',
            eInvoiceUserName: 'Dharmik123_API_AAR',
            eInvoicePassword: 'Aarihant@12344'
        };

        // 📡 API call
        const response = await axios.post(
            MICROVISTA_EINV_AUTH_URL,
            requestBody,
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const data = response.data;

        // ❌ Authentication failed
        if (data?.Status === "0") {
            return res.status(400).send({
                status: false,
                message: data.ErrorMessage || "Authentication failed",
                errorCode: data.ErrorCode,
                authToken: null,
                raw: data
            });
        }

        // ✅ Authentication success
        return res.status(200).send({
            status: true,
            message: "Auth token generated successfully",
            authToken: data.AuthToken,
            sek: data.Sek,
            tokenExpiry: data.TokenExpiry,
            raw: data
        });

    } catch (err: any) {
        return res.status(500).send({
            status: false,
            message: "Exception while generating Auth Token",
            error: err.response?.data || err.message
        });
    }
});

const MICROVISTA_GENERATE_IRN_URL =
    "https://www.ewaybills.com/MVEINVAuthenticate/EINVGeneration";

router.post("/api/microvista/production/generate-irn", async (req, res) => {
    try {
        const { authToken,gstin, monthYear, invoiceData } = req.body;

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
        const MVApiKey = "v4uuPlRON2SJDFn";
        const MVSecretKey = "k+QCsQ82OMMsoPSjvkO/cw==";
        // const gstin = "19ABCCA1254E1Z1";
        const eInvoiceUserName = "Dharmik123_API_AAR";
        const eInvoicePassword = "Aarihant@12344";

        // Make API call - Send invoice data directly in body
        const response = await axios.post(
            MICROVISTA_GENERATE_IRN_URL,
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

export default router;
