import type { LegalDocumentProps } from '@rotra/ui/legal-document'

/** P-TERMS copy, word for word from the mockup (rotra-player.html › LEGAL.terms; D-2026-11-17-01). */
export const termsOfService = {
  title: 'Terms of Service',
  effective: 'Effective November 17, 2026',
  sections: [
    {
      heading: 'What ROTRA is',
      blocks: [
        {
          kind: 'paragraph',
          text: 'ROTRA is a badminton session app. Clubs use it to run their club nights: the Queue, the courts, the games and the results. Players use it to see their profile, their games, their rank and the leaderboards.',
        },
        {
          kind: 'paragraph',
          text: "These terms apply when you use ROTRA. By continuing with Google, signing in or using the app, you agree to them. If you don't agree, please don't use ROTRA.",
        },
        {
          kind: 'paragraph',
          text: "You don't need an account to view public profiles, club pages or the leaderboards.",
        },
      ],
    },
    {
      heading: 'Your account',
      blocks: [
        {
          kind: 'list',
          items: [
            'You sign in with Google. Some older accounts also have a password until they connect Google.',
            'Use your real name and correct details, and keep them up to date. A change to your phone or email goes through a request that ROTRA Admin reviews.',
            "One account per person. Don't make an account for someone else, and don't share yours.",
            'Keep your Google account and your password safe. Email support@rotra.club if you think someone else got into your account.',
            'Your RTR ID is your ROTRA player ID. Only ROTRA Admin can change it.',
          ],
        },
      ],
    },
    {
      heading: 'Clubs and Queue Sessions',
      blocks: [
        {
          kind: 'list',
          items: [
            'Clubs run their own Queue Sessions. Each club sets its own schedule, fees, levels and house rules, and its Queue Master decides who plays and when.',
            "ROTRA is the tool the club uses. ROTRA doesn't organise the sessions and isn't responsible for the venue, the games or what happens at them.",
            "Payments are between you and the club. ROTRA doesn't collect or hold money. A club may record in ROTRA whether you paid, but refunds and disputes are for you and the club to settle.",
            'A club can save you in its players and put you in its Queue Sessions. If it saves you with your email address, you have an unclaimed profile until you register, as the Privacy Policy explains.',
          ],
        },
      ],
    },
    {
      heading: 'Results, rank and leaderboards',
      blocks: [
        {
          kind: 'list',
          items: [
            'The club records games and results. ROTRA works out levels, ranks and leaderboard places from them.',
            "Once the Queue Master confirms a result, it is permanent. A match that can't be finished can be marked invalid, and a whole Queue Session can be marked invalid when its records can't be trusted. Invalid matches and sessions don't count toward rank.",
            "Ranks and leaderboard places change as new games are played. ROTRA doesn't promise any rank or place.",
            'If you think a result is wrong, talk to the club first. You can also email support@rotra.club.',
          ],
        },
      ],
    },
    {
      heading: 'Acceptable use',
      blocks: [
        {
          kind: 'paragraph',
          text: "Don't:",
        },
        {
          kind: 'list',
          items: [
            'Make fake accounts or more than one account.',
            'Pretend to be another person, a club or ROTRA.',
            'Enter false results or try to change a rank unfairly.',
            'Harass, threaten or abuse other players, clubs or the people who run ROTRA.',
            "Copy data from ROTRA in bulk, by scraping or with automated tools, or try to see information you aren't allowed to see.",
            'Break, overload or attack the app, or get around its security.',
            'Use ROTRA to break the law.',
          ],
        },
      ],
    },
    {
      heading: 'Your content',
      blocks: [
        {
          kind: 'list',
          items: [
            'Your content is what you add to your profile: your picture, nickname, playing style, links and other details.',
            'It stays yours. You give ROTRA permission to store it and show it in the app, on share images and in links you share, as your settings allow. This permission ends when you remove the content or your account, except for copies already shared.',
            "Only add content you have the right to use. Don't add pictures of other people without their permission, or anything offensive or illegal.",
            'We may remove content that breaks these terms.',
          ],
        },
      ],
    },
    {
      heading: 'Suspension and ending an account',
      blocks: [
        {
          kind: 'list',
          items: [
            'We may suspend or close an account that is fake, breaks these terms or puts other people at risk. Where we can, we tell you why.',
            'You can ask us to close your account at any time by emailing support@rotra.club.',
            "When an account ends, some records stay, such as a club's game results and history, as the Privacy Policy explains.",
          ],
        },
      ],
    },
    {
      heading: 'The service as it is',
      blocks: [
        {
          kind: 'list',
          items: [
            "We work to keep ROTRA running and correct, but we provide it as it is. We don't promise that it will always be available, free of mistakes or right for your needs.",
            'We may change, add or remove features.',
            "As far as Philippine law allows, ROTRA isn't liable for indirect losses, or for losses caused by clubs, venues, other players or events outside our control. Nothing in these terms takes away rights that the law doesn't allow us to limit.",
          ],
        },
      ],
    },
    {
      heading: 'Changes to these terms',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We may update these terms. The date at the top shows when they last changed. If a change matters to you, we will tell you in the app. If you keep using ROTRA after a change, the new terms apply.',
        },
      ],
    },
    {
      heading: 'Governing law',
      blocks: [
        {
          kind: 'paragraph',
          text: 'These terms are governed by the laws of the Republic of the Philippines. If there is a problem, please email us first so we can try to settle it together.',
        },
      ],
    },
    {
      heading: 'Contact',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Questions about these terms: support@rotra.club.',
        },
      ],
    },
  ],
} satisfies LegalDocumentProps
