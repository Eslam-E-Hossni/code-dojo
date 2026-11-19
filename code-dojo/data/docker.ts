/**
 * Reference text of the Docker track: one line for every Dockerfile
 * instruction (shown on hover in the editor and in the "الأوامر" tab), and
 * the "build time or run time" note.
 *
 * Egyptian Arabic. Code terms are in backticks, like the coach sentences.
 * Each text starts with an Arabic word, so it is laid out right-to-left
 * wherever it is shown.
 */

export interface InstructionHelp {
  keyword: string;
  text: string;
}

export const INSTRUCTION_HELP: InstructionHelp[] = [
  {
    keyword: "FROM",
    text: "بتحدد الـ image الأساسية اللي هتبني فوقها. وكل `FROM` جديدة بتبدأ مرحلة (stage) جديدة.",
  },
  {
    keyword: "WORKDIR",
    text: "بتحدد الفولدر اللي كل `COPY` و `RUN` و `CMD` بعدها هيشتغلوا جواه. ولو مش موجود بتعمله.",
  },
  {
    keyword: "COPY",
    text: "بتنسخ ملفات من جهازك (الـ build context) لجوه الـ image. ومع `--from` بتنسخ من مرحلة تانية.",
  },
  {
    keyword: "RUN",
    text: "بتنفّذ أمر وقت بناء الـ image، ونتيجته بتتحفظ في layer جديدة.",
  },
  {
    keyword: "ENV",
    text: "بتعرّف متغير بيتحفظ جوه الـ image، وبيفضل موجود لما الـ container يشتغل.",
  },
  {
    keyword: "ARG",
    text: "بتعرّف متغير متاح وقت البناء بس، وقيمته بتيجي من `--build-arg`. مش موجود لما الـ container يشتغل.",
  },
  {
    keyword: "EXPOSE",
    text: "بتوثّق الـ port اللي التطبيق بيسمع عليه. هي مش بتفتحه: الفتح بيتم بـ `-p` وقت التشغيل.",
  },
  {
    keyword: "CMD",
    text: "الأمر الافتراضي اللي بيشتغل لما الـ container يبدأ. واحدة بس في الملف، وممكن تتغير من `docker run`.",
  },
  {
    keyword: "ENTRYPOINT",
    text: "البرنامج الثابت اللي الـ container بيشغّله. اللي في `CMD` أو بعد `docker run` بيتضاف له كـ arguments.",
  },
  {
    keyword: "USER",
    text: "بتحدد المستخدم اللي باقي السطور والـ container هيشتغلوا بيه. من غيرها المستخدم بيبقى root.",
  },
];

export interface TimeNote {
  /** ARG, ENV or NEXT_PUBLIC_ */
  name: string;
  /** When the value exists, in a few words. */
  when: string;
  text: string;
}

export const BUILD_VS_RUN: TimeNote[] = [
  {
    name: "ARG",
    when: "وقت الـ build بس",
    text: "قيمته بتيجي من `--build-arg`، وبتختفي بعد ما الـ image تتبني. متحطش فيه secrets: القيمة بتفضل ظاهرة في تاريخ الـ image.",
  },
  {
    name: "ENV",
    when: "وقت الـ build ووقت التشغيل",
    text: "محفوظ جوه الـ image من أول سطره، وموجود لما الـ container يشتغل. وممكن تغيّر قيمته وقت التشغيل بـ `docker run -e`.",
  },
  {
    name: "NEXT_PUBLIC_",
    when: "بيتقرا وقت الـ build",
    text: "متغيرات `NEXT_PUBLIC_` بيقراها `next build` وبيكتب قيمتها جوه ملفات الـ JavaScript اللي رايحة للمتصفح. فلازم تبقى موجودة قبل أمر الـ build. تغييرها وقت التشغيل مبيغيّرش اللي المتصفح شايفه.",
  },
];

/** The note that belongs to a word of a Dockerfile, or null. */
export function timeNoteFor(word: string): TimeNote | null {
  if (word.includes("NEXT_PUBLIC_")) return BUILD_VS_RUN[2];
  const upper = word.toUpperCase();
  if (upper === "ARG") return BUILD_VS_RUN[0];
  if (upper === "ENV") return BUILD_VS_RUN[1];
  return null;
}

export function instructionHelp(word: string): InstructionHelp | null {
  const upper = word.toUpperCase();
  for (let i = 0; i < INSTRUCTION_HELP.length; i++) {
    if (INSTRUCTION_HELP[i].keyword === upper) return INSTRUCTION_HELP[i];
  }
  return null;
}
