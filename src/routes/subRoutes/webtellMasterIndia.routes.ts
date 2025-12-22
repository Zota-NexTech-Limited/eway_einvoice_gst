import express from "express";

const router = express.Router();


// ================== GST ROUTES Master india==================
import axios from "axios";

router.post("/api/generate-gst-token", async (req: any, res: any) => {
    try {
        const {
            username,
            password,
            client_id,
            client_secret,
            grant_type = "password"
        } = req.body;

        if (!username || !password || !client_id || !client_secret) {
            return res.status(400).send({
                status: false,
                message: "username, password, client_id & client_secret are required"
            });
        }

        const payload = {
            username,
            password,
            client_id,
            client_secret,
            grant_type
        };

        const response = await axios.post(
            "https://commonapi.mastersindia.co/oauth/access_token",
            payload,
            { headers: { "Content-Type": "application/json" } }
        );

        return res.status(200).send({
            status: true,
            message: "GST Token generated successfully",
            access_token: response.data?.access_token,
            token_type: response.data?.token_type,
            expires_in: response.data?.expires_in,
            raw: response.data
        });

    } catch (err: any) {
        console.error(err.response?.data || err.message);

        return res.status(500).send({
            status: false,
            message: "GST Token generation failed",
            error: err.response?.data || err.message
        });
    }
});

router.get("/api/search-gstin", async (req: any, res: any) => {
    try {
        const { gstin, token, client_id } = req.body;

        if (!gstin || !token || !client_id) {
            return res.status(400).send({
                status: false,
                message: "gstin, token & client_id are required"
            });
        }

        const url = `https://commonapi.mastersindia.co/commonapis/searchgstin?gstin=${gstin}`;

        const response = await axios.get(url, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "client_id": client_id
            }
        });

        const data = response.data;

        // Masters India returns success as:
        // { status: true, message: "", data: { ... } }
        if (data?.status === true && data?.data && !data?.data?.error) {
            return res.status(200).send({
                status: true,
                message: "GST taxpayer details fetched successfully",
                taxpayer: data.data,
                raw: data
            });
        }

        return res.status(400).send({
            status: false,
            message: data?.data?.error || "Failed to fetch taxpayer details",
            raw: data
        });

    } catch (err: any) {
        console.error(err.response?.data || err.message);

        return res.status(500).send({
            status: false,
            message: "Exception while calling GST search API",
            error: err.response?.data || err.message
        });
    }
});

// =================> GST ROUTES Master india==================

// =============> EINVOICE ROUTES <=============
const WEBTEL_IRN_URL = "http://einvSandbox.webtel.in/v1.03/GenIRN";

// Provided by Webtel (MANDATORY)
// Provided by Webtel (MANDATORY)
const CDKEY = "1000687";
const EFUSERNAME = "29AAACW3775F000";
const EFPASSWORD = "Admin!23..";
const EINVUSERNAME = "29AAACW3775F000";
const EINVPASSWORD = "Admin!23..";

router.post("/api/generate-einvoice", async (req, res) => {
    try {
        const invoice = req.body;

        const generatePayload = (docNo: string) => ({
            Push_Data_List: {
                Data: [
                    {
                        ...invoice,
                        DocNo: docNo,
                        CDKey: CDKEY,
                        EFUserName: EFUSERNAME,
                        EFPassword: EFPASSWORD,
                        EInvUserName: EINVUSERNAME,
                        EInvPassword: EINVPASSWORD,
                    },
                ],
            },
        });

        let firstAttempt = await axios.post(WEBTEL_IRN_URL, generatePayload(invoice.DocNo));

        const result = firstAttempt.data?.[0];

        // 1️⃣ IRN already generated (2150)
        if (result?.ErrorCode === "2150") {
            return res.status(200).send({
                status: true,
                message: "IRN already generated earlier",
                irn: result.Irn,
                ack_no: result.AckNo,
                ack_date: result.AckDate,
                raw: result
            });
        }

        // 2️⃣ IRN cancelled & cannot be regenerated (2278) → Auto regenerate DocNo & retry
        if (result?.ErrorCode === "2278") {
            const oldDocNo = invoice.DocNo;
            const newDocNo = oldDocNo + "-R1"; // 🔥 You can customize pattern (R1 = Regenerated 1)

            console.log(`⚠ IRN cancelled earlier. Auto retrying with new Document Number: ${newDocNo}`);

            let retry = await axios.post(WEBTEL_IRN_URL, generatePayload(newDocNo));
            const retryResult = retry.data?.Data?.[0];

            if (retryResult?.Status === "1") {
                return res.status(200).send({
                    status: true,
                    message: "IRN generated successfully (after regeneration)",
                    original_doc_no: oldDocNo,
                    new_doc_no: newDocNo,
                    irn: retryResult.Irn,
                    ack_no: retryResult.AckNo,
                    ack_date: retryResult.AckDate,
                    raw: retryResult
                });
            }

            // Retry also failed
            return res.status(400).send({
                status: false,
                message: "Failed to regenerate IRN even after retrying with new DocNo",
                original_doc_no: oldDocNo,
                attempted_new_doc_no: newDocNo,
                error: retryResult,
            });
        }

        // 3️⃣ Normal success (first attempt)
        if (result?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "IRN generated successfully",
                irn: result.Irn,
                ack_no: result.AckNo,
                ack_date: result.AckDate,
                raw: result
            });
        }

        // 4️⃣ Unexpected error
        return res.status(400).send({
            status: false,
            message: result?.ErrorMessage || "Unknown error occurred",
            errorCode: result?.ErrorCode,
            raw: result,
        });

    } catch (error: any) {
        console.error("E-Invoice API Error:", error?.response?.data || error);
        return res.status(500).send({
            status: false,
            message: "API Failure",
            error: error?.response?.data || error,
        });
    }
});

const GEN_IRN_URL = "http://EinvSandbox.webtel.in/v1.03/GenIRN2";

router.post("/api/generate-irn-final", async (req, res) => {
    try {
        const invoice = req.body;

        const response = await axios.post(GEN_IRN_URL, invoice, {
            headers: {
                CDKey: "1000687",
                EInvUserName: "29AAACW3775F000",
                EInvPassword: "Admin!23..",
                EFUserName: "29AAACW3775F000",
                EFPassword: "Admin!23..",
                Version: "1.1",
                GetQRImg: "1",
                GetSignedInvoice: "1",
                "Content-Type": "application/json"
            },
        });

        const data = response.data?.[0];

        if (data?.ErrorCode === "2150" && data?.InfoDtls?.[0]?.InfCd === "DUPIRN") {
            return res.status(200).send({
                status: true,
                message: "IRN already exists — returning existing details",
                irn: data.InfoDtls[0].Desc.Irn,
                ack_no: data.InfoDtls[0].Desc.AckNo,
                ack_date: data.InfoDtls[0].Desc.AckDt,
                duplicate: true,
                raw: data
            });
        }

        if (data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "IRN generated successfully",
                irn: data.Irn,
                ack_no: data.AckNo,
                ack_date: data.AckDate,
                signed_qr_code: data.SignedQRCode,
                signed_invoice: data.SignedInvoice,
                ewaybill_no: data.EwbNo,
                ewaybill_valid_till: data.EwbValidTill,
                raw: data
            });
        }

        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to generate IRN",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling GenIRN2",
            error: err || err
        });
    }
});

const GET_EINVOICE_BY_IRN_URL = "http://EinvSandbox.webtel.in/v1.03/GetEInvoiceByIRN";

router.post("/api/get-einvoice-by-irn", async (req, res) => {
    try {
        const { irn, gstin } = req.body;

        const payload = {
            Push_Data_List: {
                Data: [
                    {
                        Irn: irn,
                        GSTIN: gstin,
                        CDKey: "1000687",
                        EFUserName: "29AAACW3775F000",
                        EFPassword: "Admin!23..",
                        EInvUserName: "29AAACW3775F000",
                        EInvPassword: "Admin!23.."
                    }
                ]
            }
        };

        const response = await axios.post(GET_EINVOICE_BY_IRN_URL, payload, {
            headers: { "Content-Type": "application/json" }
        });

        const data = response.data?.[0];

        if (data?.Status === "1") {
            return res.status(200).send({
                status: true,
                message: "E-Invoice fetched successfully",
                doc_no: data.DocNo,
                doc_date: data.DocDate,
                irn: data.Irn,
                ack_no: data.AckNo,
                ack_date: data.AckDate,
                signed_invoice: data.SignedInvoice,
                signed_qr_code: data.SignedQRCode,
                raw: data
            });
        }

        return res.status(400).send({
            status: false,
            message: data?.ErrorMessage || "Failed to fetch E-Invoice",
            errorCode: data?.ErrorCode,
            raw: data
        });

    } catch (err) {
        return res.status(500).send({
            status: false,
            message: "Exception while calling GetEInvoiceByIRN",
            error: err?.toString()
        });
    }
});

export async function printEinvoice(irn: any) {
    try {
        const payload = {
            Irn: irn,
            GSTIN: "29AAACW3775F000",
            CDKey: "1000687",
            EInvUserName: "29AAACW3775F000",
            EInvPassword: "Admin!23..",
            EFUserName: "29AAACW3775F000",
            EFPassword: "Admin!23.."
        };

        const response = await axios.post(
            "http://EinvSandbox.webtel.in/v1.03/PrintEInvByIRN",
            payload,
            { headers: { "Content-Type": "application/json" } }
        );

        const result = response.data;

        if (!result || result.length === 0) {
            return { status: false, message: "Empty response from Webtel" };
        }

        // Example response structure
        const res = result[0];

        if (res.Status === "1") {
            return {
                status: true,
                message: "E-Invoice Print Link Generated",
                url: res.File   // <-- PDF link
            };
        } else {
            return {
                status: false,
                message: res.ErrorMessage || "Failed to generate print",
                errorCode: res.ErrorCode
            };
        }
    } catch (error) {
        return {
            status: false,
            message: "API Request Failed",
            error: error
        };
    }
}

router.post("/api/einvoice-by-irn-print", async (req, res) => {
    try {
        const irn = req.body.irn;

        if (!irn) {
            return res.status(400).json({
                status: false,
                message: "IRN is required"
            });
        }

        const result = await printEinvoice(irn);

        console.log("E-Invoice Print Response:", result);

        return res.status(200).json(result);

    } catch (error) {
        console.error("Error in einvoice print route:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error
        });
    }
});

export async function generateEwaybillByIRN(data: any) {
    try {
        const payload = {
            Push_Data_List: [
                {
                    Irn: data.irn,
                    Distance: data.Distance,
                    TransMode: data.TransMode,
                    TransId: data.TransId,
                    Transname: data.Transname,
                    TransdocDt: data.TransdocDt,
                    Transdocno: data.Transdocno,
                    VehNo: data.VehNo,
                    VehType: data.VehType,
                    ShipFrom_Nm: data.ShipFrom_Nm,
                    ShipFrom_Addr1: data.ShipFrom_Addr1,
                    ShipFrom_Addr2: data.ShipFrom_Addr2,
                    ShipFrom_Loc: data.ShipFrom_Loc,
                    ShipFrom_Pin: data.ShipFrom_Pin,
                    ShipFrom_Stcd: data.ShipFrom_Stcd,
                    ShipTo_Addr1: data.ShipTo_Addr1,
                    ShipTo_Addr2: data.ShipTo_Addr2,
                    ShipTo_Loc: data.ShipTo_Loc,
                    ShipTo_Pin: data.ShipTo_Pin,
                    ShipTo_Stcd: data.ShipTo_Stcd,
                    GSTIN: "29AAACW3775F000",
                    EinvUserName: EINVUSERNAME,
                    EinvPassword: EINVPASSWORD,
                    CDKEY: CDKEY,
                    EFUSERNAME: EFUSERNAME,
                    EFPASSWORD: EFPASSWORD
                }
            ]
        };

        const response = await axios.post(
            "http://EinvSandbox.webtel.in/v1.03/GenEWaybyIRN",
            payload,
            { headers: { "Content-Type": "application/json" } }
        );

        const res = response.data[0];

        if (res.Status === "1") {
            return {
                status: true,
                message: "E-Waybill generated successfully",
                ewbNo: res.EwbNo,
                validTill: res.EwbValidTill,
                result: res
            };
        } else {
            return {
                status: false,
                message: res.ErrorMessage,
                errorCode: res.ErrorCode
            };
        }
    } catch (err: any) {
        return { status: false, message: "API Failed", error: err.message };
    }
}

router.post("/api/ewaybill-irn", async (req, res) => {
    const result = await generateEwaybillByIRN(req.body);
    return res.status(200).json(result);
});

export async function getIRNDetails(data: any) {
    try {
        const payload = {
            Push_Data_List: {
                Data: [
                    {
                        Doc_No: data.Doc_No,
                        Doc_Dt: data.Doc_Dt,
                        Doc_Typ: data.Doc_Typ,
                        GSTIN: data.GSTIN,
                        CDKey: CDKEY,
                        EInvUserName: EINVUSERNAME,
                        EInvPassword: EINVPASSWORD,
                        EFUserName: EFUSERNAME,
                        EFPassword: EFPASSWORD,
                        GetQRImg: data.getQRImg ?? "0",
                        GetSignedInvoice: data.getSignedInvoice ?? "1",
                        ImgSize: data.imgSize ?? "2"
                    }
                ]
            }
        };

        const response = await axios.post(
            "http://einvsandbox.webtel.in/v1.03/GetIRNByDocDetails",
            payload,
            { headers: { "Content-Type": "application/json" } }
        );

        const res = response.data[0];

        if (res.Status === "1") {
            return {
                status: true,
                message: "IRN fetched successfully",
                irn: res.Irn,
                ackNo: res.AckNo,
                ackDate: res.AckDate,
                ewbNo: res.EwbNo,
                signedQRCode: res.SignedQRCode,
                signedInvoice: res.SignedInvoice
            };
        } else {
            return { status: false, message: res.ErrorMessage, errorCode: res.ErrorCode };
        }
    } catch (error: any) {
        return { status: false, message: "API Failed", error: error.message };
    }
}

router.post("/api/irn-details", async (req, res) => {
    const result = await getIRNDetails(req.body);
    return res.status(200).json(result);
});

export async function cancelIRN(data: any) {
    try {
        const payload = {
            Push_Data_List: {
                Data: [
                    {
                        Irn: data.Irn,
                        GSTIN: data.GSTIN,
                        CnlRsn: data.CnlRsn,
                        CnlRem: data.CnlRem,
                        CDKey: CDKEY,
                        EFUserName: EFUSERNAME,
                        EFPassword: EFPASSWORD,
                        EInvUserName: EINVUSERNAME,
                        EInvPassword: EINVPASSWORD
                    }
                ]
            }
        };

        const response = await axios.post(
            "http://EinvSandbox.webtel.in/v1.03/CanIRN",
            payload,
            { headers: { "Content-Type": "application/json" } }
        );

        const res = response.data[0];

        if (res.Status === "1") {
            return {
                status: true,
                message: "IRN cancelled successfully",
                irn: res.Irn,
                cancelDate: res.CancelDate,
                raw: res
            };
        } else {
            return {
                status: false,
                message: res.ErrorMessage,
                errorCode: res.ErrorCode,
                raw: res
            };
        }
    } catch (error: any) {
        return {
            status: false,
            message: "API Failed",
            error: error.message
        };
    }
}

router.post("/api/cancel-irn", async (req, res) => {
    const result = await cancelIRN(req.body);
    return res.status(200).json(result);
});

// =================> EINVOICE ROUTES <=============

// =================>EWAYBILL ROUTES <=============
const EWB_URL = "http://ewaysandbox.webtel.in/Sandbox/EWayBill/v1.3/GenEWB";

const EWBUSERNAME = "29AAACW3775F000";
const EWBPASSWORD = "Admin!23..";
const AUTH_HEADER = "/IalkRmh3z4=:::ZH4TUvIeJ3A=";

async function postWebtel(url: any, body: any) {
    const headers = {
        "Authorization": AUTH_HEADER,
        "Content-Type": "application/json",
    };

    return axios.post(url, body, { headers });
}

router.post("/api/gen-ewb", async (req, res) => {
    try {
        const payload = req.body;

        // attach EF credentials + CDKey if not provided in payload
        payload.EFUserName = EFUSERNAME;
        payload.EFPassword = EFPASSWORD;
        payload.CDKey = CDKEY;

        // Basic validation (Year/Month)
        if (!payload.Year || !payload.Month || !Array.isArray(payload.Push_Data_List)) {
            return res.status(400).json({
                status: false,
                message: "Year, Month and Push_Data_List are required (Push_Data_List should be an array)."
            });
        }

        const response = await postWebtel(EWB_URL, payload);
        // Webtel returns stringified array sometimes — try to parse
        const data = Array.isArray(response.data) ? response.data : tryParseJsonArray(response.data);

        return res.status(200).json({ status: true, raw: data });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: "GenEWB API call failed",
            error: err
        });
    }
});

function tryParseJsonArray(raw: any) {
    try {
        if (typeof raw === "string") return JSON.parse(raw);
        return raw;
    } catch (e) {
        return [raw];
    }
}

export async function generateEwaybillByIRNEWay(data: any) {
    try {
        const payload = {
            Push_Data_List: [
                {
                    Irn: data.Irn,
                    Distance: data.Distance,
                    TransMode: data.TransMode,
                    TransId: data.TransId,
                    Transname: data.Transname,
                    TransdocDt: data.TransdocDt,
                    Transdocno: data.Transdocno,
                    VehNo: data.VehNo,
                    VehType: data.VehType,

                    ShipFrom_Addr1: data.ShipFrom_Addr1,
                    ShipFrom_Addr2: data.ShipFrom_Addr2,
                    ShipFrom_Loc: data.ShipFrom_Loc,
                    ShipFrom_Pin: data.ShipFrom_Pin,
                    ShipFrom_Stcd: data.ShipFrom_Stcd,

                    ShipTo_Addr1: data.ShipTo_Addr1,
                    ShipTo_Addr2: data.ShipTo_Addr2,
                    ShipTo_Loc: data.ShipTo_Loc,
                    ShipTo_Pin: data.ShipTo_Pin,
                    ShipTo_Stcd: data.ShipTo_Stcd,

                    GSTIN: data.GSTIN,                          // Mandatory
                    CDKey: CDKEY,                                // Provided by Webtel
                    EWBUserName: EWBUSERNAME,                    // From NIC Portal
                    EWBPassword: EWBPASSWORD,                    // From NIC Portal
                    EFUserName: EFUSERNAME,                      // Provided by Webtel
                    EFPassword: EFPASSWORD                       // Provided by Webtel
                }
            ]
        };

        const response = await axios.post(
            "http://ip.webtel.in/ewaygsp2/Sandbox/EWayBill/v1.3/GenEWaybyIRN",
            payload,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": AUTH_HEADER,
                }
            }
        );

        const res = response.data[0];

        if (res.IsSuccess === "true" || res.Status === "1") {
            return {
                status: true,
                message: "E-Waybill generated successfully",
                ewayBillNo: res.EWayBill || res.EwbNo,
                validTill: res.ValidUpTo,
                raw: res
            };
        } else {
            return {
                status: false,
                message: res.ErrorMessage,
                errorCode: res.ErrorCode,
                raw: res
            };
        }
    } catch (err: any) {
        return {
            status: false,
            message: "API failed",
            error: err.message
        };
    }
}

router.post("/api/ewaybill-by-irn-eway", async (req, res) => {
    const result = await generateEwaybillByIRNEWay(req.body);
    return res.status(200).json(result);
});

export async function updateVehicleEwaybill(data: any) {
    try {
        const payload = {
            Push_Data_List: [
                {
                    GSTIN: data.GSTIN,
                    SupPlace: data.SupPlace,
                    SupState: data.SupState,
                    EWBNumber: data.EWBNumber,
                    TransMode: data.TransMode,
                    TransDocNo: data.TransDocNo,
                    TransDocDate: data.TransDocDate,
                    VehicleNumber: data.VehicleNumber,
                    ReasonCode: data.ReasonCode,
                    ReasonRem: data.ReasonRem,
                    VehicleType: data.VehicleType,   // R or O
                    EWBUserName: data.EWBUserName,
                    EWBPassword: data.EWBPassword
                }
            ],
            Year: data.Year,
            Month: data.Month,
            EFUserName: data.EFUserName,
            EFPassword: data.EFPassword,
            CDKey: data.CDKey
        };

        const response = await axios.post(
            "http://ip.webtel.in/ewaygsp2/Sandbox/EWayBill/v1.3/UpdateVehicle",
            payload,
            {
                headers: {
                    "Authorization": AUTH_HEADER,
                    "Content-Type": "application/json"
                }
            }
        );

        const res = response.data[0];

        if (res.IsSuccess === "true" || res.Status === "1") {
            return {
                status: true,
                message: "Vehicle number updated successfully",
                ewayBillNo: res.EWayBill,
                vehicleNo: res.VehicleNo,
                validTill: res.ValidUpTo,
                raw: res
            };
        } else {
            return {
                status: false,
                message: res.ErrorMessage,
                errorCode: res.ErrorCode,
                raw: res
            };
        }
    } catch (err: any) {
        return {
            status: false,
            message: "API failed",
            error: err.message
        };
    }
}

router.post("/api/ewaybill-update-vehicle", async (req, res) => {
    const result = await updateVehicleEwaybill(req.body);
    return res.status(200).json(result);
});

// =============> EDOC EWAYBILL ROUTES <=============
import qs from "qs";

export async function mastersIndiaTokenAuth(username: string, password: string) {
    try {
        const payload = qs.stringify({
            username,
            password
        });

        const response = await axios.post(
            "https://sandb-api.mastersindia.co/api/v1/token-auth/",
            payload,
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }
        );

        return {
            status: true,
            token: response.data.token
        };

    } catch (err: any) {
        return {
            status: false,
            message: err.response?.data?.error || "Authentication failed",
            error: err.message
        };
    }
}

router.post("/api/mastersindia/token", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ status: false, message: "username & password required" });

    const result = await mastersIndiaTokenAuth(username, password);
    return res.status(200).json(result);
});

export async function generateEwayBillMI(data: any, token: string) {
    try {
        const response = await axios.post(
            "https://sandb-api.mastersindia.co/api/v1/ewayBillsGenerate/",
            data,
            {
                headers: {
                    "Authorization": `JWT ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const res = response.data?.results;

        if (res?.status === "Success" && res?.message?.ewayBillNo) {
            return {
                status: true,
                message: "E-Waybill generated successfully",
                ewayBillNo: res.message.ewayBillNo,
                ewayBillDate: res.message.ewayBillDate,
                validUpto: res.message.validUpto,
                pdfUrl: res.message.url,
                raw: res
            };
        }

        return {
            status: false,
            message: res?.message || "Generation failed",
            code: res?.code,
            raw: res
        };

    } catch (err: any) {
        return {
            status: false,
            message: "API failed",
            error: err.response?.data || err.message
        };
    }
}

router.post("/api/ewaybill/generate", async (req, res) => {
    const token = req.headers["authorization"]?.replace("JWT ", "");

    if (!token) {
        return res.status(400).json({
            status: false,
            message: "Missing JWT token in Authorization header"
        });
    }

    const result = await generateEwayBillMI(req.body, token);
    return res.status(200).json(result);
});

export async function cancelEwayBillMI(data: any, token: string) {
    try {
        const response = await axios.post(
            "https://sandb-api.mastersindia.co/api/v1/ewayBillCancel/",
            data,
            {
                headers: {
                    "Authorization": `JWT ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const res = response.data?.results;

        if (res?.status === "Success" && res?.message?.ewayBillNo) {
            return {
                status: true,
                message: "E-Waybill cancelled successfully",
                ewayBillNo: res.message.ewayBillNo,
                cancelDate: res.message.cancelDate,
                raw: res
            };
        }

        return {
            status: false,
            message: res?.message || "Cancellation failed",
            code: res?.code,
            raw: res
        };

    } catch (err: any) {
        return {
            status: false,
            message: "API failed",
            error: err.response?.data || err.message
        };
    }
}

router.post("/api/ewaybill/cancel", async (req, res) => {
    const token = req.headers["authorization"]?.replace("JWT ", "");

    if (!token) {
        return res.status(400).json({
            status: false,
            message: "Missing JWT token in Authorization header"
        });
    }

    const result = await cancelEwayBillMI(req.body, token);
    return res.status(200).json(result);
});

router.post("/ewaybill/update-vehicle", async (req, res) => {
    try {
        const {
            userGstin,
            eway_bill_number,
            vehicle_number,
            vehicle_type,
            place_of_consignor,
            state_of_consignor,
            reason_code_for_vehicle_updation,
            reason_for_vehicle_updation,
            transporter_document_number,
            transporter_document_date,
            mode_of_transport,
            data_source,
            token // JWT Token from token-auth API
        } = req.body;

        const payload = {
            userGstin,
            eway_bill_number,
            vehicle_number,
            vehicle_type,
            place_of_consignor,
            state_of_consignor,
            reason_code_for_vehicle_updation,
            reason_for_vehicle_updation,
            transporter_document_number,
            transporter_document_date,
            mode_of_transport,
            data_source: data_source ?? "erp",
        };

        const response = await axios.post(
            "https://sandb-api.mastersindia.co/api/v1/updateVehicleNumber/",
            payload,
            {
                headers: {
                    Authorization: `JWT ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return res.status(200).json({
            status: true,
            results: response.data
        });

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error
        });
    }
});

router.post("/ewaybill/extend-validity", async (req, res) => {
    try {
        const {
            userGstin,
            eway_bill_number,
            vehicle_number,
            place_of_consignor,
            state_of_consignor,
            remaining_distance,
            transporter_document_number,
            transporter_document_date,
            mode_of_transport,
            extend_validity_reason,
            extend_remarks,
            consignment_status,
            from_pincode,
            transit_type,
            address_line1,
            address_line2,
            address_line3,
            data_source,
            token // JWT Token
        } = req.body;

        const payload = {
            userGstin,
            eway_bill_number,
            vehicle_number,
            place_of_consignor,
            state_of_consignor,
            remaining_distance,
            transporter_document_number,
            transporter_document_date,
            mode_of_transport,
            extend_validity_reason,
            extend_remarks,
            consignment_status,
            from_pincode,
            transit_type,
            address_line1,
            address_line2,
            address_line3,
            data_source: data_source ?? "erp",
        };

        const response = await axios.post(
            "https://sandb-api.mastersindia.co/api/v1/ewayBillValidityExtend/",
            payload,
            {
                headers: {
                    Authorization: `JWT ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return res.status(200).json({
            status: true,
            results: response.data
        });

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error
        });
    }
});

router.post("/ewaybill/update-transporter", async (req, res) => {
    try {
        const {
            userGstin,
            eway_bill_number,
            transporter_id,
            transporter_name,
            token
        } = req.body;

        const payload = {
            userGstin,
            eway_bill_number,
            transporter_id,
            transporter_name
        };

        const response = await axios.post(
            "https://sandb-api.mastersindia.co/api/v1/transporterIdUpdate/",
            payload,
            {
                headers: {
                    Authorization: `JWT ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return res.status(200).json({
            status: true,
            results: response.data,
        });

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error
        });
    }
});

router.get("/ewaybill/details", async (req, res) => {
    try {
        const { gstin, eway_bill_number, token } = req.query;

        if (!gstin || !eway_bill_number || !token) {
            return res.status(400).json({
                status: false,
                message: "gstin, eway_bill_number & token are required"
            });
        }

        const url = `https://sandb-api.mastersindia.co/api/v1/getEwayBillData/?action=GetEwayBill&gstin=${gstin}&eway_bill_number=${eway_bill_number}`;

        const response = await axios.get(url, {
            headers: {
                Authorization: `JWT ${token}`
            }
        });

        return res.status(200).json({
            status: true,
            results: response.data,
        });

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error
        });
    }
});

// ===================> EDOC EINVOICE ROUTES <=================

router.post("/einvoice/generate", async (req, res) => {
    try {
        const {
            token,                 // JWT token from token-auth API
            user_gstin,
            data_source,
            transaction_details,
            document_details,
            seller_details,
            buyer_details,
            dispatch_details,
            ship_details,
            export_details,
            payment_details,
            reference_details,
            additional_document_details,
            ewaybill_details,
            value_details,
            item_list
        } = req.body;

        const payload = {
            user_gstin,
            data_source: data_source ?? "erp",
            transaction_details,
            document_details,
            seller_details,
            buyer_details,
            dispatch_details,
            ship_details,
            export_details,
            payment_details,
            reference_details,
            additional_document_details,
            ewaybill_details,
            value_details,
            item_list
        };

        const response = await axios.post(
            "https://sandb-api.mastersindia.co/api/v1/einvoice/",
            payload,
            {
                headers: {
                    Authorization: `JWT ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return res.status(200).json({
            status: true,
            results: response.data
        });

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error
        });
    }
});

router.post("/einvoice/cancel", async (req, res) => {
    try {
        const {
            token,               // JWT token from token-auth API
            user_gstin,
            irn,
            cancel_reason,
            cancel_remarks,
            ewaybill_cancel     // optional
        } = req.body;

        const payload = {
            user_gstin,
            irn,
            cancel_reason,
            cancel_remarks,
            ewaybill_cancel
        };

        const response = await axios.post(
            "https://sandb-api.mastersindia.co/api/v1/cancel-einvoice/",
            payload,
            {
                headers: {
                    Authorization: `JWT ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return res.status(200).json({
            status: true,
            results: response.data
        });

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error
        });
    }
});

router.post("/ewaybill/generate-by-irn", async (req, res) => {
    try {
        const {
            token,                                // JWT token from token-auth API
            user_gstin,
            irn,
            transporter_id,
            transportation_mode,
            transporter_document_number,
            transporter_document_date,
            vehicle_number,
            distance,
            vehicle_type,
            transporter_name,
            data_source,
            dispatch_details,
            ship_details
        } = req.body;

        const payload = {
            user_gstin,
            irn,
            transporter_id,
            transportation_mode,
            transporter_document_number,
            transporter_document_date,
            vehicle_number,
            distance,
            vehicle_type,
            transporter_name,
            data_source: data_source ?? "erp",
            dispatch_details,
            ship_details
        };

        const response = await axios.post(
            "https://sandb-api.mastersindia.co/api/v1/gen-ewb-by-irn/",
            payload,
            {
                headers: {
                    Authorization: `JWT ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return res.status(200).json({
            status: true,
            results: response.data
        });

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error
        });
    }
});

router.get("/einvoice/details", async (req, res) => {
    try {
        const { gstin, irn, token } = req.query;

        if (!token || !gstin || !irn) {
            return res.status(400).json({
                status: false,
                message: "token, gstin and irn are required"
            });
        }

        const url = `https://sandb-api.mastersindia.co/api/v1/get-einvoice?gstin=${gstin}&irn=${irn}`;

        console.log(url, 'llllllllllllllllllllll');

        const response = await axios.get(url, {
            headers: {
                Authorization: `JWT ${token}`
            }
        });

        return res.status(200).json({
            status: true,
            results: response.data
        });

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error
        });
    }
});
import fs from "fs";

router.post("/api/generate-qr-image", async (req: any, res: any) => {
    try {

        const { base64 } = req.body;

        if (!base64) {
            return res.status(400).send({
                status: false,
                message: "Base64 QR code is required"
            });
        }

        // Convert base64 to image buffer
        const buffer = Buffer.from(base64, "base64");

        const fileName = `QR_${Date.now()}.png`;
        // const filePath = `uploads/qr/${fileName}`;

        // Ensure directory exists
        if (!fs.existsSync("uploads/qr")) fs.mkdirSync("uploads/qr", { recursive: true });

        // Save image
        // fs.writeFileSync(filePath, buffer);

        // return res.status(200).send({
        //     status: true,
        //     message: "QR code image generated successfully",
        //     file_name: fileName,
        //     file_path: filePath,
        //     base64: base64, // original input
        // });

        return res.status(200).end(buffer);

    } catch (err) {
        console.error(err);
        return res.status(500).send({
            status: false,
            message: "Exception while generating QR Code",
            error: err
        });
    }
});


export default router;
