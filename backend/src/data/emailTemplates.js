/**
 * STRUCTURE Email & WhatsApp Templates
 * 
 * All templates use {{first_name}} for personalization
 * Calendar link: https://cal.com/structure-1rtlm8/ai-qualification-call
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

To continue, please schedule your consultation using the link below.

Our team has sent you a calendar invite once you book.

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Schedule your consultation here</a>

We only run these sessions for logistics businesses above certain volume and budget thresholds, so please book only if you can attend the full 45 minutes.

Best regards,
STRUCTURE Team`
  },

  // Variant 1 – Initial booking email (long, friendly, high trust)
  welcome_calendar_v2: {
    subject: 'Your automation consultation is ready to schedule',
    body: `Hi {{first_name}},

Thanks for taking the time to apply for automation with STRUCTURE.

Based on the information you shared, the next step is a 45-minute automation consultation with our team.

This is not a demo and not a sales call.

The purpose of the session is to understand how your logistics operation currently runs, identify where manual processes are creating friction, and determine whether automation makes sense at your current shipment volume and complexity.

During the call, we will:

• Walk through your end-to-end workflow
• Identify bottlenecks across quoting, operations, invoicing, finance, and customs
• Assess whether automation would realistically create impact for your business

If there is a fit, we will outline what an automation rollout could look like.

If there is not, we will tell you directly.

To move forward, you can schedule the consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Schedule here</a>

We run a limited number of these sessions and only with teams that meet minimum volume and budget thresholds, so please book only if you can attend the full 45 minutes.

Best regards,
STRUCTURE Team`
  },

  // 3) Booked meeting confirmation email
  meeting_confirmation: {
    subject: 'Your automation consultation is scheduled',
    body: `Hi {{first_name}},

Your 45-minute automation consultation with STRUCTURE has been successfully scheduled.

You will also receive a separate calendar confirmation from our scheduling system. This email is to give you additional context on what to expect.

<strong>Session overview</strong>
Duration: 45 minutes
Format: Live consultation
Focus: Understanding your current logistics workflows and assessing automation fit

During the session, we will walk through how your operation runs today, identify where manual work is creating bottlenecks, and determine whether automation can realistically improve speed, cost, or scale for your business.

This session is reserved specifically for your company and requires preparation on our side.

<strong>To confirm attendance, please click the small "yes" button in your calendar invite.</strong>

If you are unable to attend, please reschedule in advance using the link in your calendar invite.

Best regards,
STRUCTURE Team`
  },

  // 5) No-show rebooking email
  no_show_rebook: {
    subject: 'Missed automation consultation',
    body: `Hi {{first_name}},

We had you scheduled for an automation consultation earlier today, but you weren't able to attend.

These sessions are reserved for qualified logistics businesses and require preparation from our team, so we take attendance seriously.

If automation is still a priority for your business, please use the link below to reschedule your session:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Reschedule here</a>

If now isn't the right time, no worries. You can reach out when you're prepared to move forward.

Best regards,
STRUCTURE Team`
  },

  // 7-day reminder – NOT BOOKED
  reminder_7day_not_booked: {
    subject: 'Following up on your automation application',
    body: `Hi {{first_name}},

We wanted to follow up on your automation application.

You had indicated interest in exploring automation, but we did not see a consultation scheduled.

If automation is still something you are actively considering, the next step remains the 45-minute automation consultation. This is where we review your workflows and determine whether it makes sense to proceed.

If now is not the right time, no action is required. You can revisit this when it becomes a priority.

If you would like clarity before making any decisions, you can schedule the consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Schedule here</a>

Best regards,
STRUCTURE Team`
  },

  // 7-day reminder – NO SHOW
  reminder_7day_no_show: {
    subject: 'Following up on your missed consultation',
    body: `Hi {{first_name}},

We are following up regarding the automation consultation you had scheduled but were unable to attend.

These sessions are reserved for qualified logistics businesses and require preparation from our team, so attendance is important.

If automation is still a priority for your business, you may reschedule the consultation one time using the link below.

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Reschedule here</a>

If now is not the right time, no response is needed, you can revisit when it's a priority.

Best regards,
STRUCTURE Team`
  },

  // Meeting reminders
  reminder_24h: {
    subject: 'Reminder: Your automation consultation is tomorrow',
    body: `Hi {{first_name}},

This is a reminder that your 45-minute automation consultation with STRUCTURE is scheduled for tomorrow.

Please ensure you have clicked "Yes" on the calendar invite to confirm your attendance.

If you need to reschedule, please do so using the link in your calendar invite.

Best regards,
STRUCTURE Team`
  },

  reminder_6h: {
    subject: 'Your consultation is in 6 hours',
    body: `Hi {{first_name}},

Your automation consultation with STRUCTURE is coming up in about 6 hours.

Please make sure you're in a quiet space with a stable internet connection for the call.

See you soon.

Best regards,
STRUCTURE Team`
  },

  reminder_1h: {
    subject: 'Starting in 1 hour: Automation consultation',
    body: `Hi {{first_name}},

Your automation consultation with STRUCTURE starts in approximately 1 hour.

Please join using the link in your calendar invite.

Best regards,
STRUCTURE Team`
  }
};

// ============================================
// WHATSAPP MESSAGES
// ============================================

export const WHATSAPP_MESSAGES = {
  // 2) Immediate WhatsApp greeting
  welcome_greeting: `Hey {{first_name}}, Haarith here from STRUCTURE.

Thanks for applying for automation.

My team has sent you an email with the next step to schedule a 45-minute automation consultation.

Please check your email when you get a chance and book a time that works for you.

Speak soon.`,

  // 4) Booked meeting WhatsApp confirmation
  meeting_confirmation: `Hi {{first_name}},

Just confirming your automation consultation with STRUCTURE is booked.

Please check your email and click Yes in the confirmation message so we know you're all set.

Looking forward to the session.`,

  // 6) No-show WhatsApp message
  no_show_rebook: `Hi {{first_name}},

You missed your scheduled automation consultation with STRUCTURE today.

If automation is still a priority, my team has sent you an email with the option to reschedule only this once.

We look forward to seeing you on the call.`,

  // Meeting reminders
  reminder_24h: `Hi {{first_name}},

Quick reminder: Your automation consultation with STRUCTURE is tomorrow.

Please click Yes on the calendar invite if you haven't already.

See you then.`,

  reminder_6h: `Hi {{first_name}},

Your STRUCTURE consultation is in about 6 hours. Looking forward to speaking with you.`,

  reminder_1h: `Hi {{first_name}},

Your consultation starts in 1 hour. Please be ready to join via the link in your calendar.

See you shortly.`
};

// ============================================
// VALUE EMAILS (40 to cycle through)
// ============================================

export const VALUE_EMAILS = [
  // Value Email 1 - Automation order
  {
    id: 'value_01',
    subject: 'Where automation should actually start',
    body: `Hi {{first_name}},

When logistics teams think about automation, the mistake is often trying to automate everything at once.

In practice, automation creates the most impact when applied in the right order.

For most forwarders, brokers, and 3PLs, the first areas that make sense are:

• High-frequency, repeatable tasks
• Processes that rely on the same data being re-entered multiple times
• Work that delays revenue, such as invoicing or documentation

This is why quoting, documents, invoicing, and customs workflows are usually tackled before more complex optimization.

Not because they are glamorous, but because they remove friction quickly.

Understanding where automation should start in your operation depends entirely on how your workflows are currently structured.

If you want to walk through that logic for your business, you can book a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 2 - Hiring vs automation
  {
    id: 'value_02',
    subject: 'Why hiring doesn\'t always solve the problem',
    body: `Hi {{first_name}},

When volume increases, the most common response is to hire.

It feels safer. It feels immediate.

But over time, it creates a different problem: complexity without leverage.

Hiring often adds:

• More handoffs
• More coordination
• More internal communication overhead

Without workflow changes, additional people tend to absorb inefficiency rather than remove it.

Automation does not replace teams.

It changes how teams spend their time, shifting effort away from repetition and toward decision-making.

If scaling without continuously adding headcount is a concern for you, it is worth examining where process design is breaking down.

That is something we can look at together if useful. The consultation can be booked:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 3 - Late invoicing
  {
    id: 'value_03',
    subject: 'Late invoicing is rarely a finance problem',
    body: `Hi {{first_name}},

Late invoicing is often blamed on finance.

In reality, the root cause usually sits earlier in the workflow:

• Missing shipment data
• Incomplete documentation
• Manual validation steps that stall handoff

By the time finance sees the file, the delay has already happened.

This is why AI invoicing and finance automation work best when connected directly to operations and documents, not treated as a standalone accounting tool.

When data flows cleanly from shipment to invoice, revenue cycles shorten naturally.

If invoicing speed or accuracy is an issue today, it is often a signal of upstream workflow gaps.

If helpful, we can map those gaps in a consultation. You can book it:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 4 - Customs workflows
  {
    id: 'value_04',
    subject: 'What makes customs workflows actually slow',
    body: `Hi {{first_name}},

Customs workflows feel complex, but much of the work inside them is repetitive.

The same data points appear across:

• Commercial invoices
• Packing lists
• Declarations
• Clearance documents

Most delays come from re-checking, re-keying, or correcting inconsistencies between these documents.

AI customs automation focuses on consistency and completeness, not decision-making. It ensures required fields are present, aligned, and ready before submission.

This reduces back-and-forth, resubmissions, and clearance delays.

If customs handling is part of your operation, understanding how automation fits there can remove a surprising amount of friction.

You can explore this further in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 5 - Clarity
  {
    id: 'value_05',
    subject: 'The goal of automation is not technology',
    body: `Hi {{first_name}},

The goal of automation is not to adopt technology.

It is to gain clarity.

Clarity on:

• Which processes actually slow you down
• Where errors or delays originate
• What should remain manual because it adds value

Good automation decisions come from understanding your operation as a system, not from chasing features.

That is why the first step is always diagnosis, not implementation.

If you want that clarity before committing to anything, the consultation is designed for exactly that purpose.

If and when you are ready, you can book it:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 6 - Effort vs results
  {
    id: 'value_06',
    subject: 'When effort stops producing results',
    body: `Hi {{first_name}},

One of the hardest things to spot inside a growing logistics operation is the moment when effort stops producing proportional results.

Teams work longer hours.

Response times slip anyway.

Mistakes increase.

This is usually the point where adding more people stops being the answer and process design becomes the constraint.

Automation is not about doing things faster.

It is about removing the work that should not exist in the first place.

If your team is working harder but not moving faster, it is usually a signal that something structural needs to change.

If you want to examine where that might be happening, we can do that in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 7 - Visibility
  {
    id: 'value_07',
    subject: 'The hidden cost of poor visibility',
    body: `Hi {{first_name}},

In most logistics operations, the biggest time drain is not the work itself.

It is finding the information needed to do the work.

• Which shipment is this about?
• What documents are missing?
• Who needs to approve this?
• What is the status?

When answers to these questions require searching through emails, spreadsheets, and systems, every task takes longer than it should.

Automation starts with visibility.

Once information flows automatically to where it is needed, speed improves without anyone working harder.

If visibility is a constraint in your operation, it is worth understanding where the gaps are before trying to fix symptoms.

That is part of what we cover in the consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 8 - Error correction
  {
    id: 'value_08',
    subject: 'Most errors are design problems, not people problems',
    body: `Hi {{first_name}},

When errors happen in logistics workflows, the instinct is often to blame the person who made the mistake.

But most errors are not caused by carelessness.

They are caused by:

• Unclear inputs
• Ambiguous instructions
• Too many manual steps in sequence
• Systems that do not talk to each other

Fixing errors permanently requires fixing the process that allowed them to happen.

Automation reduces errors not by replacing people, but by removing the conditions where mistakes are likely.

If error rates are a concern, it is worth examining where the process itself is creating risk.

We can look at that together in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 9 - Quoting speed
  {
    id: 'value_09',
    subject: 'Why quoting speed affects win rates',
    body: `Hi {{first_name}},

In logistics, the first accurate quote often wins.

Not because customers are impatient.

Because the first quote sets the benchmark.

Every subsequent quote gets compared against it.

If your quoting process takes hours or days while competitors respond in minutes, you are not just slower. You are starting from a disadvantage.

Automation does not make quotes faster by cutting corners.

It makes them faster by eliminating the steps that add time without adding value.

If quoting speed is a bottleneck for you, it is worth examining where time is actually being lost.

We can do that in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 10 - Scaling
  {
    id: 'value_10',
    subject: 'The real barrier to scaling',
    body: `Hi {{first_name}},

Most logistics businesses can handle more volume than they think.

The barrier is rarely capacity.

It is coordination.

As volume increases:

• More people need to be aligned
• More handoffs need to happen
• More exceptions need to be managed

Without automation, coordination overhead grows faster than revenue.

This is why some companies double in size without doubling headcount, while others hire constantly and still feel understaffed.

The difference is usually process design, not effort.

If scaling feels harder than it should, it is worth examining where coordination is breaking down.

That is something we can assess in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 11 - Document handling
  {
    id: 'value_11',
    subject: 'Why document handling is still manual in most operations',
    body: `Hi {{first_name}},

Documents are everywhere in logistics.

Bills of lading, commercial invoices, packing lists, customs declarations, certificates.

And in most operations, handling them is still largely manual.

Not because the technology does not exist.

But because documents come in different formats, from different sources, with different structures.

AI document processing solves this by understanding content, not just reading files.

It extracts what matters, validates it, and routes it to where it needs to go.

If document handling is consuming time that could be spent on higher-value work, it is worth understanding how automation can change that.

We can explore it in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 12 - Communication overhead
  {
    id: 'value_12',
    subject: 'The cost of internal communication',
    body: `Hi {{first_name}},

Internal communication is essential.

But too much of it is a symptom of broken process.

When people need to constantly ask for updates, clarify instructions, or chase approvals, it means information is not flowing where it should.

Every unnecessary email, message, or meeting represents a failure of the system.

Automation reduces communication overhead by making information available where and when it is needed, without anyone having to ask.

If your team spends more time communicating about work than doing work, the problem is usually structural.

We can examine where that is happening in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 13 - Customer experience
  {
    id: 'value_13',
    subject: 'What customers actually want from logistics providers',
    body: `Hi {{first_name}},

Customers do not care about your internal processes.

They care about:

• Accurate quotes, quickly
• Shipments that arrive as promised
• Clear communication when things change
• Invoices that match what was agreed

Everything else is invisible to them.

The irony is that most internal work exists to deliver these simple outcomes.

Automation works backward from what customers actually need and removes the complexity that gets in the way.

If customer experience is inconsistent despite your team's efforts, it usually means internal processes are creating friction that customers eventually feel.

We can look at where that friction exists in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 14 - Data quality
  {
    id: 'value_14',
    subject: 'Why data quality matters more than data volume',
    body: `Hi {{first_name}},

Most logistics companies have more data than they can use.

The problem is not volume. It is quality.

Inconsistent formats, duplicate entries, missing fields, outdated records.

Bad data creates bad decisions, regardless of how sophisticated your tools are.

Automation improves data quality by:

• Validating inputs at the source
• Standardizing formats automatically
• Catching errors before they propagate

If you are struggling to get useful insights from your data, the issue is usually upstream, not in your reporting tools.

We can identify where data quality breaks down in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 15 - Exception handling
  {
    id: 'value_15',
    subject: 'Exceptions are where automation breaks or shines',
    body: `Hi {{first_name}},

Every logistics operation has exceptions.

Delays, damaged goods, missing documents, special requests.

The question is not whether exceptions will happen.

It is how they are handled when they do.

Bad automation ignores exceptions or creates more manual work to deal with them.

Good automation anticipates exceptions, flags them appropriately, and routes them to the right person with the right context.

If exceptions are consuming disproportionate time and attention, it usually means the system was not designed to handle them.

We can look at how your exception handling could be improved in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 16 - ROI
  {
    id: 'value_16',
    subject: 'How to actually calculate automation ROI',
    body: `Hi {{first_name}},

ROI on automation is often calculated incorrectly.

Teams look at time saved and multiply by hourly cost.

But that misses the bigger picture:

• Revenue recovered from faster invoicing
• Deals won from faster quoting
• Errors avoided that would have cost money
• Capacity freed for growth without hiring

The real value of automation is not just doing the same work cheaper.

It is enabling things that were not possible before.

If you are trying to build a case for automation, it helps to understand where the value actually comes from.

We can map that in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 17 - Implementation
  {
    id: 'value_17',
    subject: 'Why most automation projects fail',
    body: `Hi {{first_name}},

Most automation projects fail not because of technology.

They fail because of:

• Unclear scope
• Poor process understanding
• Resistance to change
• Unrealistic timelines

Successful automation requires understanding the operation deeply before implementing anything.

This is why we start with diagnosis, not solutions.

If you have been burned by automation projects before, or are skeptical about whether it can work for you, it is worth having a conversation about what went wrong and what would need to be different.

That is exactly what the consultation is for:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 18 - AI reality
  {
    id: 'value_18',
    subject: 'AI is not magic. It is structured problem-solving.',
    body: `Hi {{first_name}},

AI only works when it knows what "right" looks like.

In logistics, "right" is rarely a single outcome.

It is usually a range:

• Acceptable margins
• Valid documentation
• Correct customs declarations
• Approved financial checks

AI performs best when these boundaries are defined clearly.

That is why AI automation must be tailored to the operation, not copied from generic templates.

If you are curious about how AI can be shaped around your specific rules instead of forcing your team to adapt, that is exactly what we discuss in the consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 19 - AI structure
  {
    id: 'value_19',
    subject: 'AI needs structure before it can help',
    body: `Hi {{first_name}},

There is a common belief that AI can fix messy processes.

It cannot.

AI amplifies whatever it is given.

If inputs are inconsistent, AI produces inconsistent outputs.

If rules are unclear, AI makes unpredictable decisions.

This is why successful AI automation always starts with structure:

• Clear inputs
• Defined rules
• Known exceptions

Once those exist, AI becomes a force multiplier.

Without them, AI creates friction.

This is especially true in areas like finance and customs, where accuracy matters more than speed.

If you want to understand whether your workflows are ready for AI or where structure needs to be added first, that diagnostic is part of the consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 20 - AI preserving experience
  {
    id: 'value_20',
    subject: 'AI doesn\'t replace experience. It preserves it.',
    body: `Hi {{first_name}},

In many logistics teams, the most valuable knowledge lives in people's heads:

• How to price certain lanes
• Which documents usually cause issues
• What customs checks to anticipate
• When to escalate and when not to

AI allows that experience to be encoded into workflows so it scales without constant supervision.

This is how teams grow without losing quality.

If preserving experience while reducing manual effort is important to you, it is worth examining where AI can support that goal:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 21 - Process bottlenecks
  {
    id: 'value_21',
    subject: 'The bottleneck is rarely where you think it is',
    body: `Hi {{first_name}},

When operations slow down, teams often focus on the symptom.

• "We need more people in operations"
• "Finance is too slow"
• "Sales is overbooking capacity"

But bottlenecks are usually upstream from where they appear.

A slowdown in invoicing might actually be caused by incomplete documentation. A capacity issue might stem from poor quoting accuracy.

Finding the real constraint requires looking at the entire workflow, not just the pain point.

This is what we do in the consultation: trace symptoms back to root causes.

If you want that clarity:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 22 - Manual vs automated
  {
    id: 'value_22',
    subject: 'Some things should stay manual',
    body: `Hi {{first_name}},

Not everything should be automated.

Some work is better done by humans:

• Complex negotiations
• Relationship management
• Strategic decisions
• Unusual exceptions

The goal of automation is not to remove all manual work.

It is to remove the manual work that does not require human judgment.

When repetitive tasks are automated, people can focus on work that actually benefits from their expertise.

If you want to understand what should and should not be automated in your operation, we can map that in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 23 - Integration
  {
    id: 'value_23',
    subject: 'Why integration matters more than features',
    body: `Hi {{first_name}},

The most powerful software is useless if it does not connect to your existing systems.

In logistics, data lives in multiple places:

• TMS platforms
• ERPs
• Email
• Spreadsheets
• Customer portals

Automation only works when it can access and update data across all these sources.

This is why integration architecture matters more than feature lists when evaluating automation.

If you are wondering how automation would fit into your current tech stack, that is part of what we assess in the consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 24 - Change management
  {
    id: 'value_24',
    subject: 'Automation fails without buy-in',
    body: `Hi {{first_name}},

The best automation in the world will fail if your team does not use it.

Change management is not a soft issue. It is a practical one.

People resist automation when:

• They do not understand why it is happening
• They were not involved in the design
• It makes their job harder, not easier
• They fear being replaced

Successful automation requires addressing these concerns directly, not dismissing them.

If you are thinking about automation but worried about adoption, it is worth discussing how to approach it properly.

We cover that in the consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 25 - Timing
  {
    id: 'value_25',
    subject: 'When is the right time to automate?',
    body: `Hi {{first_name}},

There is no perfect time to automate.

Too early, and you do not have enough volume to justify the investment.

Too late, and inefficiency is already costing you more than automation would.

The right time is usually when:

• Manual processes are limiting growth
• Errors are becoming more frequent
• Team capacity is maxed out
• Customer expectations are increasing

If any of these apply, it is worth at least understanding what automation would look like.

That is what the consultation is for:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 26 - Competitive advantage
  {
    id: 'value_26',
    subject: 'Your competitors are automating. Are you?',
    body: `Hi {{first_name}},

Automation is no longer optional for logistics businesses that want to compete.

The companies that automate first gain:

• Lower operating costs
• Faster response times
• Higher accuracy
• More capacity without proportional headcount

Over time, these advantages compound.

Waiting to automate does not preserve the status quo. It puts you further behind.

If you want to understand where automation would create the most competitive advantage for your business, we can discuss that in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 27 - Small improvements
  {
    id: 'value_27',
    subject: 'Small improvements compound faster than you think',
    body: `Hi {{first_name}},

Automation does not need to be a massive transformation.

Small improvements in the right places create significant impact over time:

• 10% faster quoting = more deals won
• 5% fewer errors = less rework
• 15% faster invoicing = improved cash flow

These gains compound month over month.

The key is identifying where small changes will have outsized effects.

If you want to find those leverage points in your operation, we can map them in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 28 - Standardization
  {
    id: 'value_28',
    subject: 'Standardization is the foundation of automation',
    body: `Hi {{first_name}},

Automation requires consistency.

If every shipment is handled differently, every quote is formatted differently, and every document is processed differently, automation cannot help.

Standardization comes first.

This does not mean rigidity. It means:

• Clear defaults for common scenarios
• Defined exceptions for unusual cases
• Consistent data structures across the operation

Once standards exist, automation can enforce and execute them reliably.

If your operation feels too chaotic to automate, standardization is probably the missing step.

We can discuss how to approach that in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 29 - Measurement
  {
    id: 'value_29',
    subject: 'You can\'t improve what you don\'t measure',
    body: `Hi {{first_name}},

Most logistics operations do not have visibility into their own performance.

• How long does quoting actually take?
• What is the error rate by customer or lane?
• Where do delays consistently occur?

Without this data, improvement is guesswork.

Automation creates measurement as a byproduct.

When processes run through systems instead of inboxes, everything becomes visible.

If you want to understand where measurement gaps exist in your operation and how automation would address them, we can discuss that in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 30 - Time value
  {
    id: 'value_30',
    subject: 'Time is your most expensive resource',
    body: `Hi {{first_name}},

Every minute spent on repetitive work is a minute not spent on:

• Building customer relationships
• Solving complex problems
• Growing the business

Time is finite. Automation creates leverage.

It does not give you more time. It lets you spend the time you have on work that matters.

If your team's time is being consumed by low-value repetition, it is worth examining where that can be changed.

We can do that in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 31 - Complexity
  {
    id: 'value_31',
    subject: 'Complexity is a choice',
    body: `Hi {{first_name}},

Most operational complexity is not necessary.

It accumulates over time through:

• Workarounds that become permanent
• Exceptions that become rules
• Systems that are never cleaned up

Complexity makes everything harder: training, execution, automation.

Simplification is the first step to improvement.

If your operation feels more complex than it should be, it is worth examining what can be removed before adding anything new.

We can discuss that approach in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 32 - Decision fatigue
  {
    id: 'value_32',
    subject: 'Why your team is making worse decisions by afternoon',
    body: `Hi {{first_name}},

Decision fatigue is real.

Every small decision throughout the day depletes mental energy:

• Which shipment to prioritize?
• What rate to quote?
• Which document to process next?

By afternoon, decision quality drops.

Automation removes routine decisions entirely, preserving mental capacity for the decisions that actually require judgment.

If your team makes important decisions all day, automation might help more than you think.

We can explore that in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 33 - Future-proofing
  {
    id: 'value_33',
    subject: 'Future-proof your operation now',
    body: `Hi {{first_name}},

Customer expectations are increasing.

Margins are compressing.

Competition is intensifying.

The logistics businesses that thrive in the next decade will be those that build operational efficiency now.

Automation is not about fixing today's problems. It is about positioning for tomorrow's challenges.

If you want to understand how to build that foundation, we can discuss it in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 34 - Burnout
  {
    id: 'value_34',
    subject: 'Automation is a burnout prevention tool',
    body: `Hi {{first_name}},

Repetitive work burns people out.

Not because it is difficult, but because it is unfulfilling.

Teams doing the same tasks day after day eventually disengage, make more mistakes, and leave.

Automation removes the most repetitive work, leaving room for problem-solving, customer interaction, and growth.

If retention or morale is a concern, it is worth considering whether the work itself is the problem.

We can discuss that in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  // Value Email 35 - Consistency
  {
    id: 'value_35',
    subject: 'Consistency is harder than it looks',
    body: `Hi {{first_name}},

Humans are not naturally consistent.

Even the best team members will:

• Make different decisions on similar situations
• Forget steps occasionally
• Interpret rules differently

This is not a failure. It is human nature.

Automation creates perfect consistency for tasks that require it, freeing humans to apply judgment where it matters.

If consistency is important in your operation, automation is probably part of the solution.

We can discuss where in a consultation:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  }
];

// ============================================
// CLOSING EMAILS (for end of sequence)
// ============================================

export const CLOSING_EMAILS = [
  {
    id: 'close_01',
    subject: 'Is automation relevant for you right now?',
    body: `Hi {{first_name}},

At this point, one of two things is true.

Either automation is relevant for your operation right now, or it is not.

If it is not, you can safely ignore this and there is nothing further to do.

If it is, then the next logical step is the 45-minute automation consultation, where we assess fit and decide whether it makes sense to move forward.

There is no obligation and no follow-up pressure either way.

If you want clarity, you can book the session:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Best regards,
STRUCTURE Team`
  },

  {
    id: 'close_02',
    subject: 'We do not continue outreach indefinitely',
    body: `Hi {{first_name}},

We do not continue outreach indefinitely.

The consultation exists for teams that want to evaluate automation seriously and decide whether it is worth pursuing.

If that is not you right now, no action is needed and this will be our last email.

If it is, the consultation is the correct next step and can be booked:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

Either way, this closes the loop.

Best regards,
STRUCTURE Team`
  },

  {
    id: 'close_03',
    subject: 'Automation only makes sense for certain teams',
    body: `Hi {{first_name}},

Automation only makes sense for teams that are genuinely open to changing how work is done.

If your current setup is acceptable, even if imperfect, then staying as you are is often the right decision.

If, however, you are actively evaluating how to reduce manual work, improve speed, or scale more cleanly, then a structured review is necessary before making any commitments.

That review happens in the consultation.

If that is relevant, you can book it:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

If not, no further action is required.

Best regards,
STRUCTURE Team`
  },

  {
    id: 'close_04',
    subject: 'Most teams reach a decision point',
    body: `Hi {{first_name}},

Most teams reach a point where they either move forward or consciously decide not to.

Waiting without deciding usually just preserves the current state.

The consultation exists to help you make that decision with clarity, not pressure.

If you want to assess fit, timing, and feasibility properly, you can do so:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

If not, this will be our final follow-up.

Best regards,
STRUCTURE Team`
  },

  {
    id: 'close_05',
    subject: 'Final message',
    body: `Hi {{first_name}},

This will be our final message.

If automation is a priority for your business, the consultation is the appropriate next step and can be booked:

<a href="${CALENDAR_LINK}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Book here</a>

If it is not a priority right now, no response is needed.

Either way, we appreciate you taking the time to review the information.

Best regards,
STRUCTURE Team`
  }
];

export default {
  CALENDAR_LINK,
  OPERATIONAL_EMAILS,
  WHATSAPP_MESSAGES,
  VALUE_EMAILS,
  CLOSING_EMAILS
};
