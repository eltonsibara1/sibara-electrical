# How to edit your website from your phone

You only need your phone's browser. No coding.

## Add a project
1. Open **https://app.pagescms.org** and sign in (the first time, use the email invite you were sent).
2. Tap your website, then **Projects**.
3. Tap **Add an item** at the bottom of the list.
4. Fill in:
   - **Title**, for example "Geyser installation, Midrand".
   - **Type (category)**, for example "Geyser" or "Distribution Board (DB)". Use exactly the same spelling each time so jobs group together on the site.
   - **Photos**: tap to upload from your camera roll. You can add many.
   - **Information**: what you did, the size, the brand, anything a customer should know.
5. Tap **Save**. The website updates by itself within about a minute.

## Change or delete a project
Open **Projects**, tap the job to expand it, change what you need (or tap the bin icon to delete it), then **Save**.

## Tips
- Put the best photo first; it becomes the card's cover picture.
- To reorder jobs, drag them in the list.

## Post a special
1. In Pages CMS, tap **Specials**, then **Add an item**.
2. Fill in **Title**, **Price or deal** (for example "R3 500" or "10% off"), a **Photo**, and **Information** (what is included).
3. Optional: set **Ends on**. The special disappears from the website by itself after that day.
4. Tap **Save**. The "On special" section only shows on the website while there is at least one special.

## Post news
1. Tap **News**, then **Add an item**.
2. Fill in **Title**, **Date**, **Photos** and the **Story**. The newest date shows first.
3. Tap **Save**.

## Ratings and feedback
Visitors open a work card, tap 1 to 5 stars, and can leave their name and a comment. The average stars show on each card, and every comment shows inside the card.

Everything visitors send goes into a Google Sheet. **To remove a rude or fake review, open the sheet in the Google Sheets app and delete that row.** It disappears from the website straight away.

Ratings are matched to a card by its **Title**, so if you rename a card its old ratings stop showing (change the title in column B of the sheet too to keep them).

### One-time setup (about 5 minutes, on a computer is easiest)
1. Go to **https://sheets.google.com** and create a blank sheet. Name it "Sibara feedback".
2. Tap **Extensions > Apps Script**. Delete what is there and paste everything from the file `feedback/Code.gs` in this website. Click **Save**.
3. Click **Deploy > New deployment**. Click the gear next to "Select type" and pick **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**, allow the permissions Google asks for (choose your account, then **Advanced > Go to project**), and copy the **Web app URL** (it starts with `https://script.google.com/macros/s/`).
5. In Pages CMS, open **Business details**, paste the link into **Ratings and feedback link**, and **Save**.

Stars and the feedback form appear on the website within a minute. If the link is empty, the site simply hides ratings.

## Every card has WhatsApp and Email buttons
They open WhatsApp or email with a message already written that names the card, for example: *I saw your "Distribution board installations" work on your website.* They use the WhatsApp number and email in **Business details**.

## Change your phone number, WhatsApp or other details
Open **Business details**, change what you need, and tap **Save**.
