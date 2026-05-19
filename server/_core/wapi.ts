/**
 * W-API integration for sending WhatsApp messages.
 */

export async function sendWhatsappMessage(phone: string, message: string, delayMessage = 1) {
  const instanceId = process.env.W_API_INSTANCE_ID;
  const token = process.env.W_API_TOKEN;

  if (!instanceId || !token) {
    console.warn("W_API_INSTANCE_ID or W_API_TOKEN is not defined in the environment. Message not sent.");
    return false;
  }

  // Remove non-numeric characters from the phone number
  const cleanPhone = phone.replace(/\D/g, "");

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", `Bearer ${token}`);

  const raw = JSON.stringify({
    phone: cleanPhone,
    message: message,
    delayMessage: delayMessage,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow" as RequestRedirect,
  };

  try {
    const response = await fetch(`https://api.w-api.app/v1/message/send-text?instanceId=${instanceId}`, requestOptions);
    const result = await response.text();
    console.log("WhatsApp API Response:", result);
    return response.ok;
  } catch (error) {
    console.error("WhatsApp API Error:", error);
    return false;
  }
}

export async function sendWhatsappDocument(phone: string, base64Data: string, extension: string, fileName: string, caption?: string, delayMessage = 1) {
  const instanceId = process.env.W_API_INSTANCE_ID;
  const token = process.env.W_API_TOKEN;

  if (!instanceId || !token) {
    console.warn("W_API_INSTANCE_ID ou W_API_TOKEN is not defined in the environment. Document not sent.");
    return false;
  }

  const cleanPhone = phone.replace(/\D/g, "");

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", `Bearer ${token}`);

  const raw = JSON.stringify({
    phone: cleanPhone,
    document: base64Data, // Must be base64 string or data uri depending on what W-API expects. Usually just base64 or complete data URI.
    extension: extension,
    fileName: fileName,
    caption: caption || "",
    delayMessage: delayMessage,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow" as RequestRedirect,
  };

  try {
    const response = await fetch(`https://api.w-api.app/v1/message/send-document?instanceId=${instanceId}`, requestOptions);
    const result = await response.text();
    console.log("WhatsApp API Document Response:", result);
    return response.ok;
  } catch (error) {
    console.error("WhatsApp API Document Error:", error);
    return false;
  }
}
