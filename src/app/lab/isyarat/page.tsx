import type { Metadata } from "next";
import { SignLab } from "./sign-lab";

export const metadata: Metadata = {
    title: "Uji MediaPipe Isyarat · NusaTara",
    robots: { index: false },
};

export default function SignLabPage() {
    return <SignLab />;
}
