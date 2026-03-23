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
