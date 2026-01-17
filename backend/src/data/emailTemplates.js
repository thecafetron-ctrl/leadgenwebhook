/**
 * STRUCTURE Email & WhatsApp Templates
 * 
 * All templates use {{first_name}} for personalization
 * Calendar link embedded as bold "here" links
 * Clean text formatting - no buttons, proper spacing
 */

export const CALENDAR_LINK = 'https://cal.com/structure-1rtlm8/ai-qualification-call';

// ============================================
// OPERATIONAL EMAILS
// ============================================

export const OPERATIONAL_EMAILS = {
  // 1) Immediate email after form submission
  welcome_calendar: {
    subject: 'Next step: schedule your automation consultation',
    body: `Hi {{first_name}},

Thanks for applying for automation with STRUCTURE.

Based on the information you shared, the next step is a 45-minute automation consultation with our team.

This is not a demo.

It is a working session where we:

• Review how your logistics operation currently runs
• Identify where manual processes are slowing you down or increasing cost
• Assess whether automation makes sense at your current shipment volume and budget

If there is a fit, we will outline what an automation rollout could realistically look like for your business.

To continue, please schedule your consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

You will receive a calendar invite once you book.

We only run these sessions for logistics businesses above certain volume and budget thresholds, so please book only if you can attend the full 45 minutes.

Best regards,
STRUCTURE Team`
  },

  // 3) Booked meeting confirmation email
  meeting_confirmation: {
    subject: 'Your automation consultation is scheduled',
    body: `Hi {{first_name}},

Your 45-minute automation consultation with STRUCTURE has been successfully scheduled.

You will also receive a separate calendar confirmation from our scheduling system. This email is to give you additional context on what to expect.

<b>Session overview</b>
Duration: 45 minutes
Format: Live consultation
Focus: Understanding your current logistics workflows and assessing automation fit

During the session, we will walk through how your operation runs today, identify where manual work is creating bottlenecks, and determine whether automation can realistically improve speed, cost, or scale for your business.

This session is reserved specifically for your company and requires preparation on our side.

<b>To confirm attendance, please click the small "yes" button in your calendar invite.</b>

If you are unable to attend, please reschedule in advance using the link in your calendar invite.

Best regards,
STRUCTURE Team`
  },

  // No-show rebooking email
  no_show_rebook: {
    subject: 'Missed automation consultation',
    body: `Hi {{first_name}},

We had you scheduled for an automation consultation earlier today, but you weren't able to attend.

These sessions are reserved for qualified logistics businesses and require preparation from our team, so we take attendance seriously.

If automation is still a priority for your business, please reschedule your session <b><a href="${CALENDAR_LINK}">here</a></b>.

If now isn't the right time, no worries. You can reach out when you're prepared to move forward.

Best regards,
STRUCTURE Team`
  },

  // 24-hour reminder for scheduling (Step 6)
  reminder_schedule: {
    subject: 'Following up on your automation application',
    body: `Hi {{first_name}},

We wanted to follow up on your automation application.

You had indicated interest in exploring automation, but we did not see a consultation scheduled.

If automation is still something you are actively considering, the next step remains the 45-minute automation consultation. This is where we review your workflows and determine whether it makes sense to proceed.

If now is not the right time, no action is required. You can revisit this when it becomes a priority.

If you would like clarity before making any decisions, you can schedule the consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  }
};

// ============================================
// VALUE EMAILS (35 total - randomized, no repeats)
// Each one has a CTA with "here" linked to calendar
// ============================================

export const VALUE_EMAILS = [
  {
    id: 'value_1',
    subject: 'What most logistics companies get wrong about automation',
    body: `Hi {{first_name}},

Most logistics companies approach automation with one of two mindsets.

The first is waiting until they're overwhelmed. Systems are breaking, customers are complaining, and the team is stretched thin. Automation becomes an emergency reaction instead of a strategic decision.

The second is over-investing too early. Spending months on custom systems that are more complex than the business actually needs. Budgets get burned and progress stalls.

Both approaches fail.

What actually works is building automation around the specific bottlenecks that are limiting growth today, not a year from now, not based on theory.

The best time to automate is before you feel like you have to, but after you have enough volume to make it worthwhile.

If you're shipping regularly and still relying on manual processes across quoting, ops, or invoicing, you're probably already past that point.

If you want to assess where automation makes sense for your operation, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_2',
    subject: 'Why "good enough" systems quietly drain logistics businesses',
    body: `Hi {{first_name}},

A lot of logistics businesses run on systems that technically work.

Spreadsheets. Email threads. Manual data entry between platforms. Copy-paste processes that take 20 minutes but get the job done.

They call it "good enough."

And on any given day, it might be. But the cumulative cost of "good enough" shows up in ways that aren't immediately obvious:

• Slower turnaround on quotes, which loses deals
• Mistakes that require rework or refunds
• Key team members stuck doing admin instead of selling or managing

The irony is that fixing these problems isn't hard. It just requires being honest about where "good enough" is actually costing you.

If you want to identify where inefficiency is hiding in your operation, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_3',
    subject: 'How automation changes the economics of logistics',
    body: `Hi {{first_name}},

The math of logistics changes once you automate.

Before automation, scaling means more people. More operations staff. More customer service. More admin. Every new shipment adds overhead.

After automation, the same volume gets processed with less effort. The marginal cost of each additional shipment drops.

This is why some companies stay stuck at a certain revenue level and can't grow without sacrificing margin. And why others double volume without doubling headcount.

It's not about working harder. It's about removing the constraint that made work hard in the first place.

If you want to understand how automation could change your unit economics, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_4',
    subject: 'Logistics automation is not about replacing people',
    body: `Hi {{first_name}},

A common fear around automation is that it replaces jobs.

In logistics, that's rarely true.

What automation replaces is repetitive work. The same quote formats entered again and again. The same tracking updates sent manually. The same documents transferred between systems.

Once that work is automated, the people who were doing it are freed up to do something more valuable: solving problems, building relationships, expanding the business.

Teams don't shrink. They shift. And the business becomes more resilient because it's not dependent on everyone doing manual tasks correctly every time.

If you want to explore how automation could free up your team, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_5',
    subject: 'The real bottleneck in most logistics operations',
    body: `Hi {{first_name}},

When logistics businesses think about their bottlenecks, they usually look at volume.

"We need more leads."
"We need more shipments."
"We need more capacity."

But in most cases, the bottleneck isn't volume. It's throughput.

The company already has leads that don't get quoted fast enough.
Already has shipments that don't get processed smoothly.
Already has capacity that gets wasted on admin.

Fixing throughput means more revenue from the same inputs. More output from the same team. More margin from the same effort.

That's where automation actually matters.

If you want to identify where throughput is limiting your growth, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_6',
    subject: 'Quoting speed is a competitive advantage',
    body: `Hi {{first_name}},

In logistics, speed matters everywhere. But it matters most at the quote stage.

The company that responds first usually wins. Not because their price is better, but because they showed up while the customer was ready to decide.

If your quote process takes hours or days because it depends on manual inputs, carrier lookups, or back-and-forth emails, you're losing deals before you even know you were in the running.

Automating the quote process doesn't just save time. It captures revenue that was leaking out the door.

If you want to understand how automation could speed up your quoting, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_7',
    subject: 'The hidden cost of manual tracking updates',
    body: `Hi {{first_name}},

Every logistics company deals with tracking updates.

Customers want to know where their shipments are. That's reasonable. The problem is how much effort it takes to provide that information.

If your team is copying and pasting tracking numbers, writing update emails manually, or fielding inbound calls asking "where's my shipment?" then a significant chunk of their day is going to a task that creates no value.

Automated tracking updates don't just save time. They reduce customer anxiety, cut down on inbound support requests, and free your team to focus on exceptions that actually require attention.

If you want to see how automated tracking could work for your operation, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_8',
    subject: 'Why invoicing delays hurt logistics businesses more than you think',
    body: `Hi {{first_name}},

Invoicing feels like a back-office function. Something that happens after the real work is done.

But delays in invoicing have downstream effects:

• Cash flow gets unpredictable
• Finance spends time chasing payments
• Customers get confused by late or inconsistent billing

In logistics, margins are already tight. Letting invoicing slip just compresses them further.

Automating the invoicing process — generating invoices from job data, sending them on time, syncing with accounting — is one of the simplest ways to stabilize the financial side of the business.

If you want to explore how invoicing automation could improve your cash flow, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_9',
    subject: "Customs and compliance don't have to slow you down",
    body: `Hi {{first_name}},

Customs documentation is one of the most time-consuming parts of international logistics.

Getting it wrong causes delays, fees, and unhappy customers. So teams spend hours double-checking forms and cross-referencing data.

But most of that data already exists somewhere in the system. The shipment details. The product classification. The origin and destination. The regulatory requirements.

When automation pulls from that data and formats it correctly, compliance becomes a background process instead of a blocking one.

If you want to understand how automation fits into your customs workflow, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_10',
    subject: 'The first thing most logistics companies should automate',
    body: `Hi {{first_name}},

People ask us all the time: where should we start with automation?

The answer depends on the business, but one thing shows up almost universally: data entry between systems.

Every time someone manually copies a shipment reference, a customer address, a tracking number, or a price from one platform to another, there's a chance of error and a waste of time.

Connecting systems so that data flows automatically is usually the fastest win. It creates immediate time savings and reduces the mistakes that create rework.

From there, you can build. But if your team is still acting as the bridge between platforms, that's the first thing to fix.

If you want to identify the best starting point for your operation, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_11',
    subject: 'Why logistics margins stay compressed (and how to fix it)',
    body: `Hi {{first_name}},

Logistics is a margin game.

The difference between a business that scales profitably and one that struggles isn't always volume. It's the cost of processing each shipment.

When every shipment requires manual quoting, manual updates, and manual invoicing, the margin per shipment gets eaten by labour costs. Scaling just adds more cost.

When those processes are automated, the cost per shipment drops. Suddenly, margins improve without raising prices or cutting corners.

That's the real unlock.

If you want to understand how automation could improve your margins, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_12',
    subject: "Automation isn't about perfection — it's about consistency",
    body: `Hi {{first_name}},

A lot of companies delay automation because they think their processes need to be perfect first.

They don't.

Automation isn't about creating a perfect system. It's about creating a consistent one.

Right now, your team might handle tasks five different ways depending on who's doing it, what day it is, or how busy they are. Automation forces standardization. Everyone does things the same way because the system handles it.

Consistency is what makes businesses scalable. Perfection comes later.

If you want to explore how automation could bring consistency to your operation, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_13',
    subject: 'How to stop your best people from doing your worst work',
    body: `Hi {{first_name}},

In most logistics businesses, the most experienced people spend a surprising amount of time on low-value work.

Not because they want to. Because the work has to get done, and they're the ones who know how.

But when someone who could be managing relationships, solving problems, or growing the business is instead copying data into spreadsheets, that's a cost.

Automation doesn't just save time. It lets talent do what they're actually good at.

If you want to free up your best people for higher-value work, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_14',
    subject: 'Why visibility matters in logistics operations',
    body: `Hi {{first_name}},

A lot of logistics problems come down to visibility.

• Not knowing where a shipment is
• Not knowing when a task was completed
• Not knowing what's falling through the cracks

When operations are manual, visibility requires asking people. And people are busy, forgetful, or unavailable.

Automation creates visibility by default. Every event is logged. Every status is updated. Every exception is flagged. You don't have to ask because the system already shows you.

That changes how you manage.

If you want to understand how automation could improve visibility in your operation, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_15',
    subject: 'The difference between busy and productive in logistics',
    body: `Hi {{first_name}},

Busy and productive aren't the same thing.

In a lot of logistics businesses, teams are constantly busy. Running between tasks. Responding to emails. Handling exceptions. But at the end of the day, it's not clear what actually moved forward.

The problem is usually the structure of the work itself. Manual processes create constant interruptions. Everyone's reacting instead of progressing.

Automation flips that. Routine work gets handled in the background. The team focuses on decisions and exceptions, not repetition.

That's when productivity actually improves.

If you want to explore how automation could shift your team from busy to productive, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_16',
    subject: 'What happens when your ops person is out sick',
    body: `Hi {{first_name}},

Every logistics business has a few people who "just know" how things work.

They know which carriers to use. Which forms to fill out. Which customers need extra attention. When they're there, things run smoothly.

But when they're out? Chaos.

That's the fragility of relying on personal knowledge. It doesn't transfer. It doesn't scale. And it doesn't protect the business when something unexpected happens.

Automation captures processes in systems, not people. So the business works even when someone's out.

If you want to reduce your dependency on key individuals, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_17',
    subject: 'The compounding cost of small mistakes',
    body: `Hi {{first_name}},

A single mistake rarely kills a logistics business. A typo in an address. A missed email. A delayed invoice.

But mistakes compound.

Each one takes time to fix. Each one erodes customer trust. Each one distracts from bigger priorities.

When you're making the same kinds of mistakes repeatedly, the cumulative cost is real, even if each individual instance seems minor.

Automation eliminates categories of mistakes. Not by making people more careful, but by removing the opportunity for error in the first place.

If you want to identify where mistakes are costing you, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_18',
    subject: 'Scaling without breaking: how logistics companies grow sustainably',
    body: `Hi {{first_name}},

Growth in logistics often looks like controlled chaos.

More shipments. More customers. More team members. More communication threads. Everything scales, including the complexity.

Some companies manage to grow without breaking. Others collapse under their own weight.

The difference usually comes down to whether their systems scale with them. Manual processes don't scale. Automated ones do.

If you're planning to grow, build the infrastructure that supports it. Not after it becomes painful — before.

If you want to prepare your operation for scale, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_19',
    subject: 'Customer experience in logistics is mostly operational',
    body: `Hi {{first_name}},

Everyone talks about customer experience.

In logistics, most of that experience is operational. Did the shipment arrive on time? Were the updates accurate? Was the invoice correct?

You can have the best sales team in the world, but if ops can't deliver, customers won't come back.

Improving customer experience in logistics isn't about adding more touchpoints or friendlier language. It's about making the core operations work reliably.

If you want to improve customer experience through better operations, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_20',
    subject: 'Why the best logistics companies are also tech companies',
    body: `Hi {{first_name}},

The line between logistics and technology is blurring.

The best logistics companies don't just move goods. They run on systems that automate, optimize, and provide visibility that their competitors can't match.

That doesn't mean building software from scratch. But it does mean integrating tools, automating workflows, and treating technology as a core part of operations — not an afterthought.

The companies that figure this out tend to win. The ones that don't get left behind.

If you want to understand how technology could give you a competitive edge, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_21',
    subject: 'A different way to think about headcount',
    body: `Hi {{first_name}},

In most logistics businesses, headcount is tied to volume.

More shipments means more people. More people means more management. More management means more cost. It's a constant treadmill.

But headcount doesn't have to scale linearly with volume.

When routine work is automated, your team handles more with less. You don't need to hire for tasks that systems can do better.

That changes the economics. Instead of adding headcount to grow, you grow and then decide where people add the most value.

If you want to explore how automation could change your headcount equation, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_22',
    subject: 'What automation actually looks like day-to-day',
    body: `Hi {{first_name}},

Automation sounds abstract until you see it in practice.

Here's what it looks like:

A quote request comes in. The system pulls the right rates, generates the quote, and sends it within minutes — without anyone touching it.

A shipment ships. The tracking updates are sent to the customer automatically. No one has to remember.

A job completes. The invoice is generated and sent the same day, synced to accounting.

That's not the future. That's what's possible right now.

If you want to see what automation could look like for your operation, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_23',
    subject: 'The risk of not automating',
    body: `Hi {{first_name}},

There's a temptation to see automation as optional. Something to explore "when there's time."

But the risk of waiting is real.

Competitors who automate move faster, respond quicker, and operate with lower costs. Over time, they take market share.

Meanwhile, your team stays stuck in manual processes. Growth becomes harder. Margins get compressed. The gap widens.

You don't have to be first. But waiting too long has consequences.

If you want to assess whether now is the right time for automation, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_24',
    subject: 'Why we only work with logistics businesses above a certain size',
    body: `Hi {{first_name}},

We're selective about who we work with at STRUCTURE.

Not because we don't want to help smaller businesses, but because automation creates the most impact once there's enough volume to justify it.

If you're doing a handful of shipments a month, manual processes are probably fine. The time saved from automation wouldn't outweigh the investment.

But once you're moving real volume — where manual work becomes a bottleneck and errors have real consequences — that's when automation delivers returns.

If you want to assess whether automation makes sense at your current scale, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_25',
    subject: "Automation doesn't mean losing control",
    body: `Hi {{first_name}},

A common concern with automation is that it takes control away.

What if the system makes a mistake? What if things change?

Good automation doesn't remove control. It gives you more of it.

Instead of manually checking every task, you set the rules and monitor the exceptions. Instead of being in the weeds, you're overseeing the operation from a higher level.

You're still in charge. You're just not doing everything yourself.

If you want to understand how automation could give you more control, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_26',
    subject: "The cost of 'we've always done it this way'",
    body: `Hi {{first_name}},

Familiarity is comfortable.

Your team knows the current process. Customers are used to it. Changing things feels risky.

But "we've always done it this way" is often the most expensive decision a company makes.

It keeps you stuck in inefficiency because it's familiar. It blocks better options because they're unfamiliar.

At some point, what used to work becomes what holds you back. That's usually when it's time to change.

If you want to evaluate whether your current processes are helping or holding you back, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_27',
    subject: 'How to evaluate whether automation is worth it',
    body: `Hi {{first_name}},

Evaluating automation comes down to a few questions:

1. How much time does your team spend on repetitive tasks?
2. How often do mistakes happen because of manual data entry?
3. How quickly can you respond to customers compared to your competitors?

If the answers are "a lot," "too often," and "not fast enough," automation is probably worth exploring.

If everything's running smoothly and efficiently without it, it might not be the priority yet.

If you want help evaluating whether automation is right for your business, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_28',
    subject: 'Speed compounds in logistics',
    body: `Hi {{first_name}},

Being faster than your competition is an obvious advantage.

But speed compounds in ways that aren't obvious.

Faster quotes mean more deals closed.
Faster processing means better customer experience.
Faster invoicing means better cash flow.

Each improvement feeds into the next. Over time, fast companies pull ahead not just a little, but a lot.

That's why speed matters even when things are going fine. Fine doesn't compound. Fast does.

If you want to understand how automation could make your operation faster, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_29',
    subject: 'The automation tipping point',
    body: `Hi {{first_name}},

Every logistics business hits a point where manual processes stop scaling.

It usually shows up as growing pains: missed deadlines, frustrated staff, customer complaints, margin pressure.

That's the tipping point. The moment where what got you here won't get you further.

Recognizing it early gives you time to fix it before it becomes a crisis. Waiting until it's obvious usually means you're already behind.

If you want to assess whether you're approaching that tipping point, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_30',
    subject: 'The integration problem in logistics tech',
    body: `Hi {{first_name}},

Most logistics companies use multiple tools.

TMS. Accounting software. CRM. Carrier platforms. Email. Spreadsheets.

The problem isn't the tools. It's that they don't talk to each other.

Data gets stuck in silos. Information has to be transferred manually. Nothing flows.

Automation, at its core, is about making systems work together. When they do, the sum becomes greater than the parts.

If you want to explore how your systems could be better connected, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_31',
    subject: 'Why implementation matters as much as strategy',
    body: `Hi {{first_name}},

A lot of businesses know what they need to automate. The strategy is clear.

But strategy without implementation is worthless.

Automation projects fail when they get stuck in planning. When teams debate endlessly without doing. When "we should" never becomes "we did."

Execution matters. Shipping something imperfect and iterating beats planning something perfect and never launching.

If you want to move from strategy to implementation, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_32',
    subject: 'The best automation is invisible',
    body: `Hi {{first_name}},

The best automation isn't impressive. It's invisible.

It's the quote that goes out without anyone noticing.
The update that's sent automatically.
The invoice that arrives right on time.

No fanfare. No special effort. Just consistent execution that happens in the background.

That's the goal — not a complex system to admire, but one that works so well you forget it's there.

If you want to explore what invisible automation could look like for you, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_33',
    subject: 'What separates logistics companies that scale from those that struggle',
    body: `Hi {{first_name}},

After working with dozens of logistics companies, a pattern emerges.

The ones that scale share a few traits:

• They treat operations as a competitive advantage, not a cost center
• They build systems that don't depend on specific people
• They invest in automation before they're forced to

The ones that struggle do the opposite. They wait until things break before fixing them.

It's not about being bigger. It's about being better at handling growth.

If you want to build the foundation for sustainable scale, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_34',
    subject: 'A logistics business is only as good as its processes',
    body: `Hi {{first_name}},

In logistics, the product is the process.

The shipment itself is commoditized. What differentiates one company from another is how reliably and efficiently they handle it.

Great processes mean fast quotes, accurate tracking, smooth operations, and correct invoices.

Poor processes mean delays, confusion, mistakes, and frustration.

Investing in process — and automating it — is investing in the product itself.

If you want to improve your processes through automation, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'value_35',
    subject: "You don't have to figure this out alone",
    body: `Hi {{first_name}},

Most logistics businesses don't have automation expertise in-house.

That's not a criticism — why would they? Running logistics is already a full-time job.

But not having expertise doesn't mean not moving forward. It means partnering with people who've done it before.

That's what we do at STRUCTURE. We bring the automation experience so you don't have to build it from scratch.

If you're ready to explore what that looks like, you can book a consultation <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  }
];

// ============================================
// CLOSING EMAILS (5 total - end of sequence)
// ============================================

export const CLOSING_EMAILS = [
  {
    id: 'closing_1',
    subject: 'At this point, one of two things is true',
    body: `Hi {{first_name}},

At this point, one of two things is true.

Either automation is relevant for your operation right now, or it is not.

If it is not, you can safely ignore this and there is nothing further to do.

If it is, then the next logical step is the 45-minute automation consultation, where we assess fit and decide whether it makes sense to move forward.

There is no obligation and no follow-up pressure either way.

If you want clarity, you can book the session <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'closing_2',
    subject: 'We do not continue outreach indefinitely',
    body: `Hi {{first_name}},

We do not continue outreach indefinitely.

The consultation exists for teams that want to evaluate automation seriously and decide whether it is worth pursuing.

If that is not you right now, no action is needed and this will be our last email.

If it is, the consultation is the correct next step and can be booked <b><a href="${CALENDAR_LINK}">here</a></b>.

Either way, this closes the loop.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'closing_3',
    subject: 'Automation only makes sense for certain teams',
    body: `Hi {{first_name}},

Automation only makes sense for teams that are genuinely open to changing how work is done.

If your current setup is acceptable, even if imperfect, then staying as you are is often the right decision.

If, however, you are actively evaluating how to reduce manual work, improve speed, or scale more cleanly, then a structured review is necessary before making any commitments.

That review happens in the consultation.

If that is relevant, you can book it <b><a href="${CALENDAR_LINK}">here</a></b>.

If not, no further action is required.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'closing_4',
    subject: 'Most teams reach a decision point',
    body: `Hi {{first_name}},

Most teams reach a point where they either move forward or consciously decide not to.

Waiting without deciding usually just preserves the current state.

The consultation exists to help you make that decision with clarity, not pressure.

If you want to assess fit, timing, and feasibility properly, you can do so <b><a href="${CALENDAR_LINK}">here</a></b>.

If not, this will be our final follow-up.

Best regards,
STRUCTURE Team`
  },
  {
    id: 'closing_5',
    subject: 'Final message',
    body: `Hi {{first_name}},

This will be our final message.

If automation is a priority for your business, the consultation is the appropriate next step and can be booked <b><a href="${CALENDAR_LINK}">here</a></b>.

If it is not a priority right now, no response is needed.

Either way, we appreciate you taking the time to review the information.

Best regards,
STRUCTURE Team`
  }
];

// ============================================
// WHATSAPP MESSAGES
// ============================================

export const WHATSAPP_MESSAGES = {
  // Immediate WhatsApp after form fill
  welcome: `Hey {{first_name}}, Haarith here from STRUCTURE.

Thanks for applying for automation.

My team has sent you an email with the next step to schedule a 45-minute automation consultation.

Please check your email when you get a chance and book a time that works for you.

Speak soon.`,

  // Meeting confirmation
  meeting_confirmation: `Hi {{first_name}},

Just confirming your automation consultation with STRUCTURE is booked.

Please check your email and click Yes in the confirmation message so we know you're all set.

Looking forward to the session.`,

  // 24hr reminder
  reminder_24hr: `Hi {{first_name}},

Quick reminder: Your automation consultation with STRUCTURE is tomorrow.

Please click Yes on the calendar invite if you haven't already.

See you then.`,

  // 1hr reminder
  reminder_1hr: `Hi {{first_name}},

Your consultation starts in 1 hour. Please be ready to join via the link in your calendar.

See you shortly.`,

  // No-show follow-up
  no_show: `Hi {{first_name}},

You missed your scheduled automation consultation with STRUCTURE today.

If automation is still a priority, my team has sent you an email with the option to reschedule.

We look forward to seeing you on the call.`
};

export default {
  CALENDAR_LINK,
  OPERATIONAL_EMAILS,
  VALUE_EMAILS,
  CLOSING_EMAILS,
  WHATSAPP_MESSAGES
};
