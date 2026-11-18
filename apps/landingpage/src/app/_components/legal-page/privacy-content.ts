import type { LegalDocumentProps } from './legal-document'

/**
 * P-PRIVACY copy, word for word from the mockup (rotra-player.html › LEGAL.privacy; D-2026-11-17-01,
 * D-2026-11-18-02). rotra.club shows the same text in
 * apps/landingpage/src/app/_components/legal-page/privacy-content.ts.
 */
export const privacyPolicy = {
  title: 'Privacy Policy',
  effective: 'Effective November 18, 2026',
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
          text: 'ROTRA is operated by [OPERATOR LEGAL NAME], [OPERATOR ADDRESS]. In this policy, "ROTRA", "we" and "us" mean [OPERATOR LEGAL NAME]. We are responsible for your information under the law. The law calls this the personal information controller.',
        },
        {
          kind: 'paragraph',
          text: 'This policy explains what information ROTRA keeps about you, why we keep it, and what you can do about it. It covers the ROTRA apps and the website rotra.club. It is written for players and clubs in the Philippines and follows the Data Privacy Act of 2012 (Republic Act No. 10173).',
        },
        {
          kind: 'paragraph',
          text: 'Our Data Protection Officer is the person responsible for data protection at ROTRA. For questions and privacy requests, email support@rotra.club.',
        },
        {
          kind: 'paragraph',
          text: 'Clubs and ROTRA have different jobs. A club decides which players it saves and adds to its Queue Sessions, and it is responsible for having the right to do so. ROTRA is responsible for the platform, for player profiles and for ranks.',
        },
      ],
    },
    {
      heading: 'What we collect',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We collect only what ROTRA needs to work:',
        },
        {
          kind: 'list',
          items: [
            'Your account: your full name, nickname, email address, mobile number and profile picture. Also the details you choose to add, such as your playing style, when you started playing and links to your social profiles, the city or province you give when you register without a club, and the requests you send us, such as a change to your phone or email.',
            "If you sign in with Google: your Google email address, your name and your profile picture. Nothing else. ROTRA can't read your Gmail, your contacts, your Google Drive or anything else in your Google account.",
            'Your play: the Queue Sessions you join, the games you play, their scores and results, and the rank and statistics worked out from them.',
            'What a club saves about you: your name, nickname, picture, level and email address, and your mobile number if the club adds it.',
            "A club account: the club's name, its founding address and city, its sign-in name, its logo, its license and the license payments recorded in ROTRA, and the Queue Sessions, courts and players it keeps in ROTRA.",
            "A quotation request on rotra.club: the club's name, city, main venue, courts per night and nights per week, your full name, your role at the club, your email address and mobile number, the plan you're interested in and anything else you write.",
            'A profile search on rotra.club: the name or RTR ID you type. It goes to the ROTRA Player app to find the profile.',
            "Technical information: the cookies that keep you signed in, settings on your device such as light or dark mode, basic server logs and sign-in records (such as when a page was requested, the internet (IP) address it came from and any errors), technical traces that help us find and fix problems, and page-visit counts that don't identify you.",
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
          text: "Under the Terms of Service, a club that saves someone confirms that it has that person's permission, and a parent's or guardian's permission for anyone under 18.",
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
          text: "You can object or ask for removal at any time. If you don't want to register and want your unclaimed profile removed, ask the club that saved you to delete it, or email support@rotra.club.",
        },
      ],
    },
    {
      heading: 'Why we use your information',
      blocks: [
        {
          kind: 'paragraph',
          text: 'The Data Privacy Act asks us to have a lawful reason, called a legal basis, for each use of your information. These are ours.',
        },
        {
          kind: 'paragraph',
          text: 'To provide the service you or your club asked for. This is our agreement with you:',
        },
        {
          kind: 'list',
          items: [
            'To run club nights: to put you in a Queue Session, in the Queue and on a court, and to record your games and results.',
            'To show your profile, games, rank and leaderboard places in the app.',
            'To sign you in and keep your account safe.',
            'To let clubs find you and add you to their Queue Sessions.',
            'To handle your requests, such as a password reset or a change to your phone or email. ROTRA Admin reviews these by hand.',
            'To show you notifications in the app.',
            "To run a club's account and license, and to answer a club's quotation request and contact the club about its plan and payment.",
          ],
        },
        {
          kind: 'paragraph',
          text: 'With your consent:',
        },
        {
          kind: 'list',
          items: [
            'When you register, and for the optional details you add to your profile, such as your playing style, when you started playing and your social links.',
            'If you sign in with Google, for the details Google shares with us.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'You can withdraw your consent at any time. Remove an optional detail from your profile, or ask us to close your account. Withdrawing doesn\'t undo what we did before, and some records stay, as "How long we keep it" explains.',
        },
        {
          kind: 'paragraph',
          text: 'For our legitimate interests, which we weigh against your rights:',
        },
        {
          kind: 'list',
          items: [
            "To keep clubs' game records complete, because other players' games and ranks depend on them.",
            'To work out ranks, statistics and leaderboards from the levels and results clubs record.',
            'To keep the unclaimed profiles clubs save, so their games count and the person can take the profile over when they register.',
            'To check accounts. For example, where Google sign-in is offered, a player is verified when a Google account is connected, a mobile number is on the account and the ROTRA email matches the Google email. ROTRA Admin can also verify an account.',
            'To keep ROTRA secure and to prevent fake accounts, false results and other abuse.',
            'To fix problems and keep the app working, using logs, traces and page-visit counts.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'When the law requires it: to keep the records the law asks us to keep, and to answer a valid order from a court or a government agency.',
        },
        {
          kind: 'paragraph',
          text: "We don't use your information for advertising, and we don't sell it.",
        },
      ],
    },
    {
      heading: 'Levels, ranks and automated processing',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Clubs give each player a playing level. ROTRA works out ranks, statistics and leaderboard places automatically, from those levels and from the results clubs record. No person checks each one.',
        },
        {
          kind: 'paragraph',
          text: "They are about badminton only. They have no legal effect on you, and we don't use them to make decisions about you outside ROTRA.",
        },
        {
          kind: 'paragraph',
          text: "If you think a result, level or rank is wrong, talk to the club first, because the club records results and sets levels. If that doesn't settle it, email support@rotra.club and we will look into it.",
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
            'The authorities, when the law requires it, for example a valid order from a court or a government agency.',
            'A new operator, if ROTRA is ever sold or merged with another business. We will tell you before your information passes to them.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'Service providers run parts of ROTRA for us. They handle your information only to provide their services to us. Today they are:',
        },
        {
          kind: 'list',
          items: [
            'Vercel, which hosts the ROTRA apps and rotra.club, and counts page visits in the apps.',
            'Supabase, which runs our database, file storage (such as profile pictures) and sign-in, and sends the emails that sign-in needs.',
            'Google, which handles Google sign-in where it is offered.',
            'Grafana Labs, which receives technical traces of requests and errors when we turn this monitoring on, so we can find and fix problems.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'This list can change. When it does, we update this page. We never sell your information.',
        },
      ],
    },
    {
      heading: 'Where it is stored and how we protect it',
      blocks: [
        {
          kind: 'paragraph',
          text: "Your information is stored on our providers' servers outside the Philippines. Today the ROTRA apps run in Singapore. Our providers may also process information in other countries. Wherever it is, we stay responsible for it.",
        },
        {
          kind: 'paragraph',
          text: 'We protect it with reasonable organisational, physical and technical measures. These include sign-in, encrypted connections and access checks: the app shows each person only what they are allowed to see, and only ROTRA Admin can use the admin tools.',
        },
        {
          kind: 'paragraph',
          text: 'No system is perfectly safe.',
        },
      ],
    },
    {
      heading: 'If there is a breach',
      blocks: [
        {
          kind: 'paragraph',
          text: 'If a breach puts your information at risk, we will tell the National Privacy Commission and the people affected within 72 hours of learning of it, when the law requires us to.',
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
          text: 'We keep a quotation request as long as we need it to answer it and, if the club joins ROTRA, to run its account.',
        },
        {
          kind: 'paragraph',
          text: 'We keep server logs and traces only as long as we need them to fix problems and keep ROTRA secure.',
        },
        {
          kind: 'paragraph',
          text: 'For pictures, we keep only your current and your previous uploaded picture. Older ones are deleted.',
        },
      ],
    },
    {
      heading: 'Cookies and device storage',
      blocks: [
        {
          kind: 'paragraph',
          text: 'ROTRA uses only the cookies and device storage it needs: to keep you signed in, to remember settings such as light or dark mode, and to finish a sign-in or registration you started.',
        },
        {
          kind: 'paragraph',
          text: "We don't use advertising or tracking cookies.",
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
            'Complain to the National Privacy Commission (privacy.gov.ph) if you think your rights were not respected.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'To use any of these rights, email support@rotra.club from the email address on your account, or tell us which account it is. We may ask you to show that the account is yours before we act. We answer every request by email, as soon as we reasonably can.',
        },
      ],
    },
    {
      heading: 'Children',
      blocks: [
        {
          kind: 'paragraph',
          text: 'You must be 18 or older to register for ROTRA on your own. Anyone under 18 may use ROTRA only with the consent of a parent or guardian.',
        },
        {
          kind: 'paragraph',
          text: "Clubs may include players under 18 in their Queue Sessions and save them in the app. A club that adds a player under 18 confirms that it has a parent's or guardian's consent.",
        },
        {
          kind: 'paragraph',
          text: "A parent or guardian who wants to see, correct or remove a child's information can email support@rotra.club. If we learn that a child's information was added without that consent, we remove it.",
        },
      ],
    },
    {
      heading: 'Links to other sites',
      blocks: [
        {
          kind: 'paragraph',
          text: "Profiles can link to social media and other sites, and you can sign in with Google where it is offered. Those sites and services have their own privacy policies. This policy doesn't cover them.",
        },
      ],
    },
    {
      heading: 'Changes to this policy',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We may change this policy when ROTRA changes. The date at the top shows when it last changed. If a change matters to you, we will tell you in the app or by email before it applies.',
        },
      ],
    },
    {
      heading: 'Contact',
      blocks: [
        {
          kind: 'paragraph',
          text: '[OPERATOR LEGAL NAME], [OPERATOR ADDRESS].',
        },
        {
          kind: 'paragraph',
          text: 'Questions about this policy or your information, and requests for our Data Protection Officer: support@rotra.club.',
        },
      ],
    },
  ],
} satisfies LegalDocumentProps
