import { GoogleGenAI } from "npm:@google/genai@^2.3.0";

// ─── Interfaces exportadas ─────────────────────────────────────────────────

export interface GeneratedOption {
  text: string;
  is_correct: boolean;
}

export interface GeneratedQuestion {
  text: string;
  question_type: "single_choice";
  options: GeneratedOption[];
  explanation: string;
  source_basis: string;
}

export interface GeneratedActivity {
  activity_title: string;
  activity_description: string;
  questions: GeneratedQuestion[];
}

// ─── Schema JSON para la respuesta estructurada de Gemini ──────────────────

function buildResponseSchema(questionCount: number) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      activity_title: {
        type: "string",
        description: "Título corto de la actividad de reforzamiento.",
      },
      activity_description: {
        type: "string",
        description: "Descripción breve de los temas evaluados.",
      },
      questions: {
        type: "array",
        minItems: questionCount,
        maxItems: questionCount,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            text: {
              type: "string",
              description: "Enunciado claro de la pregunta.",
            },
            question_type: {
              type: "string",
              enum: ["single_choice"],
            },
            options: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  text: { type: "string" },
                  is_correct: { type: "boolean" },
                },
                required: ["text", "is_correct"],
              },
            },
            explanation: {
              type: "string",
              description:
                "Una sola explicación pedagógica continua y completa de por qué la respuesta es correcta con base en lo explicado en la clase (sin mencionar la palabra 'transcripción').",
            },
            source_basis: {
              type: "string",
              description:
                "Tema o concepto clave de la clase en el que se sustenta.",
            },
          },
          required: [
            "text",
            "question_type",
            "options",
            "explanation",
            "source_basis",
          ],
        },
      },
    },
    required: ["activity_title", "activity_description", "questions"],
  };
}

// ─── Función principal exportada ────────────────────────────────────────────

/**
 * Genera una actividad de reforzamiento con preguntas de selección única
 * usando la API de Gemini. Lanza un Error si la generación falla o el
 * resultado no cumple las validaciones.
 *
 * @param transcript    Texto de la clase / transcripción (200–300 000 chars)
 * @param classTitle    Título descriptivo de la clase
 * @param questionCount Número de preguntas a generar (1–10)
 * @param apiKey        Clave de API de Gemini
 */
export async function generateActivity(
  transcript: string,
  classTitle: string,
  questionCount: number,
  apiKey: string,
): Promise<GeneratedActivity> {
  const prompt = `
Actúa como diseñador pedagógico de actividades de reforzamiento académico universitario.

Debes generar exactamente ${questionCount} preguntas de selección única
para la sesión de clase titulada "${classTitle}".

REGLAS OBLIGATORIAS:

1. Utiliza exclusivamente información sustentada en el contenido de la clase.
2. No inventes conceptos, cifras, definiciones ni conclusiones.
3. Cada pregunta debe tener exactamente cuatro opciones claras y bien redactadas.
4. Solo una opción puede ser correcta.
5. Evita preguntas triviales sobre nombres, saludos, asistencia o logística.
6. Prioriza comprensión, aplicación práctica y relación entre los conceptos expuestos.
7. Las opciones incorrectas deben ser plausibles, pero claramente distinguibles de la correcta.
8. Escribe todo en español con un tono pedagógico, profesional y riguroso.
9. En el campo "explanation", redacta UNA SOLA explicación pedagógica continua y completa que aclare por qué la respuesta es correcta y la relacione con lo explicado en la clase. NO utilices expresiones como "la transcripción dice", "según la transcripción" o "en la transcripción"; utiliza siempre referencias naturales a la clase (por ejemplo: "En la clase se explicó que...", "Durante la sesión se enfatizó que...", "El docente aclaró que...").
10. En el campo "source_basis", indica brevemente el tema o concepto clave de la clase en el que se fundamenta.
11. No incluyas información que no pueda verificarse en el contenido de la clase.
12. Distribuye la respuesta correcta de forma equilibrada entre las distintas posiciones.

CONTENIDO DE LA CLASE:

<contenido_clase>
${transcript}
</contenido_clase>
`;

  const ai = new GoogleGenAI({ apiKey });

  const interaction = await ai.interactions.create({
    model: "gemini-3.5-flash-lite",
    input: prompt,
    store: false,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: buildResponseSchema(questionCount),
    },
  });

  const outputText = interaction.output_text;
  if (!outputText) {
    throw new Error("Gemini no devolvió contenido");
  }

  const activity = JSON.parse(outputText) as GeneratedActivity;

  // ── Validaciones ──────────────────────────────────────────────────────────
  if (
    !Array.isArray(activity.questions) ||
    activity.questions.length !== questionCount
  ) {
    throw new Error("La cantidad de preguntas generada no es válida");
  }

  for (const question of activity.questions) {
    if (
      !Array.isArray(question.options) ||
      question.options.length !== 4
    ) {
      throw new Error("Una pregunta no contiene cuatro opciones");
    }

    const correctOptions = question.options.filter(
      (option) => option.is_correct === true,
    );

    if (correctOptions.length !== 1) {
      throw new Error(
        "Una pregunta no contiene exactamente una respuesta correcta",
      );
    }
  }

  return activity;
}
