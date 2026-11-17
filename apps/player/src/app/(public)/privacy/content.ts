import type { LegalDocumentProps } from '@rotra/ui/legal-document'

/** P-PRIVACY copy, word for word from the mockup (rotra-player.html › LEGAL.privacy; D-2026-11-17-01). */
export const privacyPolicy = {
  title: 'Privacy Policy',
  effective: 'Effective November 17, 2026',
  sections: [
    {
      heading: 'Who we are',
      blocks: [
        {
          kind: 'paragraph',
          text: 'ROTRA is a badminton session app. Clubs use it to run their club nights: the Queue, the courts, the games and the results. Players use it to see their profile, their games and their rank.',
        },
        {
          kind: 'paragraph',
          text: 'This policy explains what information ROTRA keeps about you, why we keep it, and what you can do about it. It is written for players and clubs in the Philippines and follows the Data Privacy Act of 2012 (Republic Act No. 10173).',
        },
        {
          kind: 'paragraph',
          text: 'In this policy, "ROTRA", "we" and "us" mean the people who run ROTRA. For questions and privacy requests, email support@rotra.club.',
        },
      ],
    },
    {
      heading: 'What we collect',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We collect only what the app needs to work:',
        },
        {
          kind: 'list',
          items: [
            'Your account: your full name, nickname, email address, mobile number and profile picture. Also the details you choose to add, such as your playing style, when you started playing and links to your social profiles, the city or province you give when you register without a club, and the requests you send us, such as a change to your phone or email.',
            "From Google sign-in: your Google email address, your name and your profile picture. Nothing else. ROTRA can't read your Gmail, your contacts, your Google Drive or anything else in your Google account.",
            'Your play: the Queue Sessions you join, the games you play, their scores and results, and the level, rank and statistics worked out from them.',
            'What a club saves about you: your name, nickname, picture, level and email address, and your mobile number if the club adds it.',
            "Technical information: the cookies that keep you signed in, a setting on your device that remembers light or dark mode, basic server logs (such as when a page was requested and any errors), and page-visit counts that don't identify you.",
          ],
        },
        {
          kind: 'paragraph',
          text: "We don't ask for your government ID or payment card details, and we don't track your location.",
        },
      ],
    },
    {
      heading: 'People saved by a club before they register',
      blocks: [
        {
          kind: 'paragraph',
          text: "A club's Queue Master can save a player who hasn't joined ROTRA yet, so the club can put them in its Queue Sessions and record their games. There are two kinds:",
        },
        {
          kind: 'list',
          items: [
            'A guest is a name only. A guest has no email, no phone and no ROTRA profile of their own.',
            'An unclaimed profile is a person the club saved with their email address. It gets an RTR ID, the ROTRA player ID, and can appear on the leaderboards.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'An unclaimed profile is public: anyone can see its name, picture, level, games and rank. Its email address and phone number are never shown publicly. Another club can find an unclaimed profile only by typing its exact email address or RTR ID.',
        },
        {
          kind: 'paragraph',
          text: 'If a club saved you, register with the same email address to take over your profile. Your RTR ID and your games come with you, and you can then choose who sees your profile.',
        },
        {
          kind: 'paragraph',
          text: "If you don't want to register and want your unclaimed profile removed, ask the club that saved you to delete it, or email support@rotra.club.",
        },
      ],
    },
    {
      heading: 'How we use your information',
      blocks: [
        {
          kind: 'list',
          items: [
            'To run club nights: to put you in a Queue Session, in the Queue and on a court, and to record your games and results.',
            'To show your profile, games, rank and leaderboard places in the app.',
            'To sign you in and keep your account safe.',
            'To check your account. A player is verified when a Google account is connected, a mobile number is on the account and the ROTRA email matches the Google email.',
            'To let clubs find you and add you to their Queue Sessions.',
            'To handle your requests, such as a password reset or a change to your phone or email. ROTRA Admin reviews these by hand.',
            'To show you notifications in the app, fix problems and keep the app working.',
          ],
        },
        {
          kind: 'paragraph',
          text: "We don't use your information for advertising, and we don't sell it.",
        },
      ],
    },
    {
      heading: 'What is public and what is private',
      blocks: [
        {
          kind: 'list',
          items: [
            'Your email address and mobile number are never shown publicly. Where the app shows your number to you, it is masked, like +63 917 ••• ••42. ROTRA Admin sees the full number. You can also hide your phone number from clubs.',
            "Your profile has three visibility settings. Public: anyone can see your name, level, games and profile. Private, the default: visitors who aren't signed in see a masked name, and signed-in ROTRA players see your profile. Always private: only you, and the Queue Master of a session you join, see your name, level and games.",
            'Your picture and profile banner are always public, even when your profile is Always private.',
            'Hide me from Player Information stops clubs from finding you by your RTR ID or email, and leaves you out of public club member lists.',
            "A club's public session page lists who is playing with masked names, and never shows contact details.",
          ],
        },
      ],
    },
    {
      heading: 'Who we share it with',
      blocks: [
        {
          kind: 'list',
          items: [
            'Clubs you play at. A club that saved you, or whose Queue Session you join, sees what it needs to run its sessions, such as your name, picture, level and your games there. It sees your phone number unless you hide it from clubs.',
            'Service providers that run ROTRA for us: hosting, the database, picture storage and sign-in. Today Vercel hosts the app, and Supabase runs our database, file storage and sign-in. Google handles Google sign-in. They handle your information to provide these services to us.',
            'The authorities, when the law requires it, for example a valid order from a court or a government agency.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'We never sell your information.',
        },
      ],
    },
    {
      heading: 'Where it is stored and how we protect it',
      blocks: [
        {
          kind: 'paragraph',
          text: "Your information is stored on our providers' servers. Today the app and the database run in Singapore, so your information is kept outside the Philippines.",
        },
        {
          kind: 'paragraph',
          text: 'We protect it with sign-in, encrypted connections and access checks: the app shows each person only what they are allowed to see, and only ROTRA Admin can use the admin tools.',
        },
        {
          kind: 'paragraph',
          text: 'No system is perfectly safe. If a breach puts your information at risk, we will tell you and the National Privacy Commission as the Data Privacy Act requires.',
        },
      ],
    },
    {
      heading: 'How long we keep it',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We keep your information while your account or your profile exists.',
        },
        {
          kind: 'paragraph',
          text: "Some records stay after that when they are still needed: a club's game results and history, which other players' games and ranks depend on, and records the law asks us to keep.",
        },
        {
          kind: 'paragraph',
          text: 'For pictures, we keep only your current and your previous uploaded picture. Older ones are deleted.',
        },
      ],
    },
    {
      heading: 'Your rights',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Under the Data Privacy Act of 2012 you have the right to:',
        },
        {
          kind: 'list',
          items: [
            'Be informed about how your information is collected and used. This policy is part of that.',
            'Access the information we hold about you.',
            'Correct information that is wrong. You can edit most of your profile yourself. A change to your phone or email goes through a request that ROTRA Admin reviews.',
            'Object to how we use your information, and withdraw your consent.',
            'Ask us to erase or block your information.',
            'Get a copy of your information in a common electronic format (data portability).',
            'Claim damages if you were harmed by wrong or unlawful use of your information.',
            'Complain to the National Privacy Commission if you think your rights were not respected.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'To use any of these rights, email support@rotra.club from the email address on your account, or tell us which account it is. We may ask you to show that the account is yours before we act. We answer every request by email.',
        },
      ],
    },
    {
      heading: 'Children',
      blocks: [
        {
          kind: 'paragraph',
          text: "Clubs may include players under 18 in their Queue Sessions and save them in the app. A parent or guardian who wants to see, correct or remove a child's information can email support@rotra.club.",
        },
      ],
    },
    {
      heading: 'Changes to this policy',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We may change this policy when ROTRA changes. The date at the top shows when it last changed. If a change matters to you, we will tell you in the app.',
        },
      ],
    },
    {
      heading: 'Contact',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Questions about this policy or your information: support@rotra.club.',
        },
      ],
    },
  ],
} satisfies LegalDocumentProps
