"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function GuidePage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-black">WhatsApp Setup Guide</h2>
        <p className="text-sm text-zinc-500">
          How to get your Meta WhatsApp Business API credentials.
        </p>
      </div>

      <Card className="border-zinc-200 bg-white">
        <CardHeader>
          <CardTitle className="text-base text-black">What you need</CardTitle>
          <CardDescription className="text-zinc-500">
            To send WhatsApp messages from this app, you need three values from Meta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-medium text-black">1. Access Token</div>
              <div className="mt-1 text-xs text-zinc-500">
                A secret key that lets this app talk to Meta on your behalf.
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-medium text-black">2. WABA ID</div>
              <div className="mt-1 text-xs text-zinc-500">
                Your WhatsApp Business Account ID.
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-medium text-black">3. Phone Number ID</div>
              <div className="mt-1 text-xs text-zinc-500">
                The ID of the phone number you will send messages from.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-zinc-100" />

      {/* Step 1 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
            1
          </div>
          <h3 className="text-base font-semibold text-black">Find your WABA ID</h3>
        </div>

        <Card className="border-zinc-200 bg-white">
          <CardContent className="space-y-4 pt-6">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-600">
              <li>Go to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="font-medium text-black underline-offset-2 hover:underline">business.facebook.com</a></li>
              <li>Open the left menu and click <strong>WhatsApp Manager</strong> or <strong>WhatsApp Accounts</strong></li>
              <li>Click on your WhatsApp Business Account name</li>
              <li>Look for the account ID at the top — it is a long number</li>
            </ol>
            <div className="rounded-md bg-zinc-50 p-3 text-xs text-zinc-500">
              Example: <code className="font-mono text-black">3312365308972321</code>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step 2 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
            2
          </div>
          <h3 className="text-base font-semibold text-black">Find your Phone Number ID</h3>
        </div>

        <Card className="border-zinc-200 bg-white">
          <CardContent className="space-y-4 pt-6">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-600">
              <li>Inside the same WhatsApp account, click the <strong>Phone numbers</strong> tab</li>
              <li>Click on the phone number you want to use</li>
              <li>The Phone Number ID is shown near the top of the page</li>
            </ol>
            <div className="rounded-md bg-zinc-50 p-3 text-xs text-zinc-500">
              Example: <code className="font-mono text-black">123456789012345</code>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step 3 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
            3
          </div>
          <h3 className="text-base font-semibold text-black">Generate an Access Token</h3>
        </div>

        <Card className="border-zinc-200 bg-white">
          <CardContent className="space-y-4 pt-6">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-600">
              <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="font-medium text-black underline-offset-2 hover:underline">developers.facebook.com</a></li>
              <li>Open your app (create one if you do not have it)</li>
              <li>Go to <strong>App Settings → Basic</strong> and copy the <strong>App Secret</strong> (you will need it for webhooks later)</li>
              <li>Now go to <strong>WhatsApp → API Setup</strong> or <strong>WhatsApp → Getting Started</strong></li>
              <li>Click <strong>Generate access token</strong></li>
              <li>Select your WhatsApp Business Account when asked</li>
              <li>Copy the token</li>
            </ol>
            <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-700">
              <strong>Important:</strong> The token is shown only once. Save it somewhere safe.
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="bg-zinc-100" />

      {/* Paste section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-black">Paste them in the app</h3>

        <Card className="border-zinc-200 bg-white">
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-zinc-600">
              Go to <strong>Settings → WhatsApp Connection</strong> or complete Step 1 of the onboarding flow. Paste the three values:
            </p>

            <div className="space-y-3">
              <div>
                <LabelText>Access Token</LabelText>
                <code className="block rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-mono text-black">
                  EAABsB...
                </code>
              </div>
              <div>
                <LabelText>WABA ID</LabelText>
                <code className="block rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-mono text-black">
                  3312365308972321
                </code>
              </div>
              <div>
                <LabelText>Phone Number ID</LabelText>
                <code className="block rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-mono text-black">
                  123456789012345
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="bg-zinc-100" />

      {/* Verification */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-black">Verify it works</h3>

        <Card className="border-zinc-200 bg-white">
          <CardContent className="space-y-4 pt-6">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-600">
              <li>After clicking <strong>Connect</strong>, the status should change to <strong>Connected</strong></li>
              <li>Create a template and submit it to Meta for approval</li>
              <li>Once approved, create a campaign and send a test message to your own number</li>
            </ol>
            <div className="rounded-md bg-zinc-50 p-3 text-xs text-zinc-500">
              If the connection fails, double-check that the phone number is verified in Meta Business Manager and that your access token has not expired.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LabelText({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-xs font-medium text-zinc-500">{children}</div>;
}
