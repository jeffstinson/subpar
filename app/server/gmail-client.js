import { getGmailAccessToken } from "./integrations";

async function gmailJson(path, params = {}) {
  const token = await getGmailAccessToken();
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`);
  for (const [key,value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key,String(value));
  }
  const response = await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
  const data = await response.json();
  if (!response.ok) throw new Error(`Gmail API request failed: ${data.error?.message || response.status}`);
  return data;
}

export async function fetchGmailThread(threadId) {
  if (!threadId) throw new Error("threadId is required");
  return gmailJson(`threads/${encodeURIComponent(threadId)}`,{format:"full"});
}

export async function fetchGmailMessage(messageId) {
  if (!messageId) throw new Error("messageId is required");
  return gmailJson(`messages/${encodeURIComponent(messageId)}`,{format:"full"});
}

export async function listGmailThreads({query="",pageToken=null,limit=100}={}) {
  const safeLimit=Math.max(1,Math.min(Number(limit)||100,500));
  const data=await gmailJson("threads",{q:query||undefined,pageToken:pageToken||undefined,maxResults:safeLimit,includeSpamTrash:false});
  return {
    threads:data.threads||[],
    nextPageToken:data.nextPageToken||null,
    resultSizeEstimate:data.resultSizeEstimate??null,
  };
}

export function extractGmailThreadIds(history = []) {
  const ids = new Set();
  for (const entry of history || []) {
    for (const item of entry.messagesAdded || []) {
      const threadId = item?.message?.threadId;
      if (threadId) ids.add(threadId);
    }
    for (const message of entry.messages || []) {
      if (message?.threadId) ids.add(message.threadId);
    }
  }
  return [...ids];
}
