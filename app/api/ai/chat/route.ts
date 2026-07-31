import { NextRequest } from "next/server";

import { gemini } from "@/lib/ai/gemini";
import { groq } from "@/lib/ai/groq";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatRequestBody = {
  message?: unknown;
  provider?: unknown;
};
const encoder = new TextEncoder();

function createSSEEvent(event: string, data: unknown) {
  return encoder.encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  );
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function getErrorStatus(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return null;
}

async function generateResponseWithRetry(message: string) {
  const maximumAttempts = 3;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      return await gemini.models.generateContentStream({
        model: "gemini-3.6-flash",
        contents: message,
        config: {
          systemInstruction:
            "You are Helix Assistant, a professional customer-support AI. Give clear, accurate, helpful, and concise answers. Ask a clarifying question when important information is missing.",
        },
      });
    } catch (error) {
      const status = getErrorStatus(error);
      const canRetry = status === 429 || status === 503;

      if (!canRetry || attempt === maximumAttempts) {
        throw error;
      }

      const delay = 1000 * 2 ** (attempt - 1);

      console.warn(
        `Gemini returned ${status}. Retrying in ${delay}ms. Attempt ${attempt + 1}/${maximumAttempts}.`,
      );

      await wait(delay);
    }
  }

  throw new Error("Gemini request failed after all retry attempts.");
}
//////////////
async function generateGroqResponse(message: string) {
  return groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "You are Helix Assistant, a professional customer-support AI. Give clear, accurate, helpful, and concise answers. Ask a clarifying question when important information is missing.",
      },
      {
        role: "user",
        content: message,
      },
    ],
    stream: true,
  });
}
//////////


export async function POST(request: NextRequest) {
  let body: ChatRequestBody;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        error: "Request body must contain valid JSON.",
      },
      {
        status: 400,
      },
    );
  }

  const message =
    typeof body.message === "string" ? body.message.trim() : "";

    ///////////
    const provider =
  body.provider === "gemini" || body.provider === "groq"
    ? body.provider
    : "auto";
    ///////////
  if (!message) {
    return Response.json(
      {
        error: "Message is required.",
      },
      {
        status: 400,
      },
    );
  }

  if (message.length > 4000) {
    return Response.json(
      {
        error: "Message must not exceed 4000 characters.",
      },
      {
        status: 400,
      },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;

      const closeStream = () => {
        if (closed) {
          return;
        }

        closed = true;
        controller.close();
      };

      request.signal.addEventListener("abort", closeStream);

      try {
        controller.enqueue(
          createSSEEvent("start", {
            message: "AI response stream started.",
          }),
        );

// const response =
//   provider === "groq"
//     ? await generateGroqResponse(message)
//     : await generateResponseWithRetry(message);
///////////////
// let response;

// if (provider === "groq") {
//   response = await generateGroqResponse(message);
// } else if (provider === "gemini") {
//   response = await generateResponseWithRetry(message);
// } else {
//   try {
//     response = await generateResponseWithRetry(message);
//   } catch (error) {
//     console.warn("Gemini failed. Falling back to Groq.", error);
//     response = await generateGroqResponse(message);
//   }
// }
let response;
let activeProvider: "gemini" | "groq";

if (provider === "groq") {
  activeProvider = "groq";
  response = await generateGroqResponse(message);
} else if (provider === "gemini") {
  activeProvider = "gemini";
  response = await generateResponseWithRetry(message);
} else {
  try {
    activeProvider = "gemini";
    response = await generateResponseWithRetry(message);
  } catch (error) {
    console.warn("Gemini failed. Falling back to Groq.", error);

    activeProvider = "groq";
    response = await generateGroqResponse(message);
  }
}
////////////

//         for await (const chunk of response) {
//   if (closed || request.signal.aborted) {
//     break;
//   }

//   const text =
//     activeProvider === "groq"
//       ? chunk.choices[0]?.delta?.content
//       : chunk.text;

//   if (!text) {
//     continue;
//   }

//   controller.enqueue(
//     createSSEEvent("chunk", {
//       content: text,
//     }),
//   );
// }

if (activeProvider === 'groq') {
  const groqResponse = response as Awaited<
    ReturnType<typeof generateGroqResponse>
  >

  for await (const chunk of groqResponse) {
    if (closed || request.signal.aborted) {
      break
    }

    const text = chunk.choices[0]?.delta?.content

    if (!text) {
      continue
    }

    controller.enqueue(
      createSSEEvent('chunk', {
        content: text,
      }),
    )
  }
} else {
  const geminiResponse = response as Awaited<
    ReturnType<typeof generateResponseWithRetry>
  >

  for await (const chunk of geminiResponse) {
    if (closed || request.signal.aborted) {
      break
    }

    const text = chunk.text

    if (!text) {
      continue
    }

    controller.enqueue(
      createSSEEvent('chunk', {
        content: text,
      }),
    )
  }
}


        if (!closed && !request.signal.aborted) {
          controller.enqueue(
            createSSEEvent("complete", {
              message: "AI response stream completed.",
            }),
          );

          closeStream();
        }
      } catch (error) {
        console.error("Gemini streaming error:", error);

        if (!closed && !request.signal.aborted) {
          controller.enqueue(
            createSSEEvent("error", {
              message:
                "The AI provider could not generate a response. Please try again.",
            }),
          );

          closeStream();
        }
      } finally {
        request.signal.removeEventListener("abort", closeStream);
      }
    },

    cancel() {
      console.log("AI stream cancelled by the client.");
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
