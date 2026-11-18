import type { LegalDocumentProps } from '@rotra/ui/legal-document'

/**
 * P-TERMS copy, word for word from the mockup (rotra-player.html › LEGAL.terms; D-2026-11-17-01,
 * D-2026-11-18-02). rotra.club shows the same text in
 * apps/landingpage/src/app/_components/legal-page/terms-content.ts.
 */
export const termsOfService = {
  title: 'Terms of Service',
  effective: 'Effective November 18, 2026',
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
          text: 'ROTRA is operated by [OPERATOR LEGAL NAME], [OPERATOR ADDRESS]. In these terms, "ROTRA", "we" and "us" mean [OPERATOR LEGAL NAME]. These terms cover the ROTRA apps and the website rotra.club.',
        },
        {
          kind: 'paragraph',
          text: "These terms apply when you use ROTRA. By registering, signing in or using ROTRA, you agree to them. If you don't agree, please don't use ROTRA.",
        },
        {
          kind: 'paragraph',
          text: 'The Privacy Policy is part of these terms. It explains what information we keep and why.',
        },
        {
          kind: 'paragraph',
          text: 'If you use ROTRA for a club, for example by signing in to a club account or by requesting a quotation, you confirm that you are allowed to act for that club. These terms then apply to the club too.',
        },
        {
          kind: 'paragraph',
          text: "You don't need an account to view public profiles, club pages or the leaderboards.",
        },
      ],
    },
    {
      heading: 'Who can use ROTRA',
      blocks: [
        {
          kind: 'paragraph',
          text: 'You must be 18 or older to register on your own. Anyone under 18 may use ROTRA only with the consent of a parent or guardian.',
        },
        {
          kind: 'paragraph',
          text: "A club that adds a player under 18 confirms that it has a parent's or guardian's consent.",
        },
      ],
    },
    {
      heading: 'Your account',
      blocks: [
        {
          kind: 'list',
          items: [
            'You sign in with your email and password, or with Google where it is offered.',
            'Use your real name and correct details, and keep them up to date. A change to your phone or email goes through a request that ROTRA Admin reviews.',
            "One account per person. Don't make an account for someone else, and don't share yours.",
            'Keep your password safe, and your Google account if you sign in with it. Email support@rotra.club if you think someone else got into your account.',
            'Your RTR ID is your ROTRA player ID. Only ROTRA Admin can change it.',
          ],
        },
      ],
    },
    {
      heading: 'Club accounts and licenses',
      blocks: [
        {
          kind: 'list',
          items: [
            'A club can ask to use ROTRA by requesting a quotation on rotra.club. A request is not a contract. The agreement starts only when the club accepts a quotation from us.',
            "ROTRA Admin sets up each club account, with the club's name, its founding address and city, and its sign-in name and first password. The club keeps its password safe and can change it in Club settings. Whoever signs in to the club account acts for the club.",
            "A club uses the Queue app with a monthly or yearly license. The license, its fees, its period, how it is paid and any refunds are as the club's accepted quotation says. Nothing in these terms or in the quotation takes away rights the law gives the club.",
            'The club pays outside ROTRA. ROTRA Admin turns the license on once it is paid, and the club can see its license payments in Club settings.',
            "When a license ends and isn't renewed, the club can't use the Queue app, including its saved players and reports. A Queue Session already running may finish. The club's public session pages stop being updated, and are deleted later if the license stays ended. Renewing before then brings them back. Players keep their games and ranks.",
          ],
        },
        {
          kind: 'paragraph',
          text: 'The club confirms, and is responsible for, the following:',
        },
        {
          kind: 'list',
          items: [
            "It has the right, and each player's permission, to add that player's details to ROTRA, and a parent's or guardian's permission for a player under 18.",
            'It records results and levels honestly.',
            'It alone is responsible for its Queue Sessions, its fees, its venue and the safety of its players, and for following the law, including the Data Privacy Act for the information it keeps.',
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
      heading: 'Playing is at your own risk',
      blocks: [
        {
          kind: 'list',
          items: [
            'Badminton is a physical sport, and injuries can happen.',
            "ROTRA doesn't run sessions, doesn't check venues or courts, and doesn't give medical or fitness advice.",
            'You are responsible for your own health and fitness, and for deciding whether to play.',
            "As far as the law allows, ROTRA isn't liable for any injury, loss or damage that happens at a session or a venue.",
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
            'The club records games and results and gives each player a playing level. ROTRA works out ranks, statistics and leaderboard places from them.',
            "Once the Queue Master confirms a result, it is permanent. A match that can't be finished can be marked invalid, and a whole Queue Session can be marked invalid when its records can't be trusted. Invalid matches and sessions don't count toward rank.",
            "Ranks and leaderboard places change as new games are played. ROTRA doesn't promise any rank or place.",
            "ROTRA levels and ranks are not an official rating from any badminton federation or association, and they don't come with any prize or entitlement.",
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
            'Use bots or other automated tools to get into ROTRA, or take apart or reverse engineer the app, except as far as the law allows.',
            'Upload or send viruses or other harmful code.',
            "Use other players' information for marketing or spam.",
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
      heading: "ROTRA's property",
      blocks: [
        {
          kind: 'list',
          items: [
            'The ROTRA name and logo, its characters and artwork, its design and its software belong to ROTRA or to those who license them to us.',
            "We give you a personal permission to use ROTRA as these terms allow. You can't transfer it to anyone else.",
            "Don't copy or reuse any of these without our written permission. Sharing your profile or results with the app's share tools is fine.",
          ],
        },
      ],
    },
    {
      heading: "Other companies' services",
      blocks: [
        {
          kind: 'list',
          items: [
            'Some parts of ROTRA use services from other companies, such as Google sign-in where it is offered. Those services have their own terms, which apply when you use them.',
            "Profiles can link to other sites. We don't control those sites and aren't responsible for them.",
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
            'ROTRA is a new product that we are still building. Features may change, and mistakes can happen.',
            "We work to keep ROTRA running and correct, but we provide it as it is. We don't promise that it will always be available, free of mistakes or right for your needs.",
            'We may change, add or remove features.',
            'Parts of ROTRA, including some of its artwork and software, are made with the help of AI tools. We review them before they are released.',
            'We make no promises beyond what these terms say and what the law requires.',
          ],
        },
      ],
    },
    {
      heading: 'Limits on our liability',
      blocks: [
        {
          kind: 'paragraph',
          text: 'As far as Philippine law allows:',
        },
        {
          kind: 'list',
          items: [
            "ROTRA isn't liable for indirect or consequential losses, lost profits or lost data.",
            "ROTRA isn't liable for losses caused by clubs, venues, other players or events outside our control.",
            "ROTRA's total liability to you is limited to the fees you paid ROTRA in the 12 months before the claim, if any.",
          ],
        },
        {
          kind: 'paragraph',
          text: "Nothing in these terms limits liability for fraud, wilful misconduct or gross negligence, or takes away rights under the Consumer Act of the Philippines, the Data Privacy Act or any other law that can't be waived.",
        },
      ],
    },
    {
      heading: 'If your actions cause a claim',
      blocks: [
        {
          kind: 'paragraph',
          text: "As far as the law allows, you cover ROTRA's losses when someone makes a claim against ROTRA because of:",
        },
        {
          kind: 'list',
          items: [
            'Your breach of these terms.',
            'Your content.',
            'For a club: its Queue Sessions, and the player information it adds.',
          ],
        },
      ],
    },
    {
      heading: 'Events outside our control',
      blocks: [
        {
          kind: 'paragraph',
          text: "We aren't responsible for delays or failures caused by events we can't reasonably control, such as typhoons, earthquakes and other natural disasters, power or internet outages, failures of our providers, or government action.",
        },
      ],
    },
    {
      heading: 'Changes to these terms',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We may update these terms. The date at the top shows when they last changed. We announce important changes in the app or by email before they apply. If you keep using ROTRA after a change applies, the new terms apply.',
        },
      ],
    },
    {
      heading: 'Governing law and disputes',
      blocks: [
        {
          kind: 'paragraph',
          text: 'These terms are governed by the laws of the Republic of the Philippines.',
        },
        {
          kind: 'paragraph',
          text: 'If there is a problem, please email us first. We and you will both try in good faith to settle it together.',
        },
        {
          kind: 'paragraph',
          text: "If we can't settle it, it goes to the proper courts of [OPERATOR CITY], Philippines. This doesn't take away any right the law gives you to bring a case somewhere else.",
        },
      ],
    },
    {
      heading: 'General',
      blocks: [
        {
          kind: 'list',
          items: [
            "If one part of these terms can't be enforced, the rest still applies.",
            "If we don't enforce a term right away, we haven't given it up.",
            'These terms, the Privacy Policy and, for a club, its accepted quotation are the whole agreement between you and ROTRA. If the quotation and these terms differ on fees or the license period, the quotation wins.',
            'ROTRA may transfer this agreement to a new operator if ROTRA is sold or merged. We will tell you if that happens.',
            'These terms are written in English. If they are translated, the English version governs.',
          ],
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
          text: 'Questions about these terms: support@rotra.club.',
        },
      ],
    },
  ],
} satisfies LegalDocumentProps
