import type { Metadata } from "next";
import Link from "next/link";
import { SelfCheck } from "@/components/SelfCheck";

export const metadata: Metadata = { title: "فحص ذاتي" };

export default function SelfCheckPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:py-12">
      <Link href="/" dir="ltr" className="text-sm font-bold tracking-wide text-gold">
        Code Dojo
      </Link>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">فحص ذاتي</h1>
      <p className="mt-3 max-w-2xl leading-8 text-mut">
        الصفحة دي بتشغّل الحل المرجعي بتاع كل مسألة على الـ tests المستخبية بتاعتها، وبتشغّل كود كل سؤال output
        وتقارنه بالسطور المتخزنة له، في المتصفح اللي إنت فاتحه دلوقتي. لو كله أخضر يبقى الـ runner شغال هنا زي ما
        المفروض. وكل اختبار مرجعي في مسار الـ Testing بيتشغّل على الكود الصح وعلى كل نسخة فيها bug. مسائل React مش
        هنا، لأنها بتشتغل في الـ preview.
      </p>
      <SelfCheck />
    </main>
  );
}
