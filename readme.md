# Inqob.com

Private Repository

## Ideas

Results from brainstorming or just out of the blue ideas

## What it looks like


### Job layout

1. 1 job per line, so jobs are listed below each other. each line is taking the full with of the container it is in.
2. job consists of
  * title (clickable link)
  * company
  * location
  * image (optional)
3. how to show the full job description
  * show full job description in an overlay on top of the page with scrolling inside
  * open the url in a new window to the Inqob.com site
4. adding a new job is done by clicking on the button (link) which then opens a new page at Inqob.com using the url from the original page as a reference
  * initial form will be dead simple, ala 37Signals
  * advertiser adds the job and submits
  * site owner gets an e-mail notification with a link to approve the job ad
    * when he approves the advertiser gets an e-mail with the request to pay money via Paypal
    * when he doesn't approve the advertiser gets an e-mail with the reason
  * once the job has been paid for it will be enabled
5. the site owner can specify if he wants jobs per site or per url or per keyword
  * site owner sets the price and duration for a job ad
    * duration may be set to 30 first as a default (seems sensible)
    * Inqob.com will pay the site owner 50% of the set price for renting the space
  * first up will be just per url
  * he can specify the maximum number of jobs per page view
6. to be able to add jobs to your site initially all we need is an e-mail address
  * this e-mail address is also where we will transfer the funds to
  * later we may need more information for billing and taxation stuff
  * jobs will be grouped by this e-mail address on the Inqob.com site (not public)
7. to be able to post a job initially all we need is an e-mail address
  * this e-mail address will be used to ask money from you via Paypal
  * jobs will be grouped by this e-mail address on the Inqob.com site (not public)
8. Inqob.com will also aggregate all links that have job postings on them, so job searchers could use that as a way to see jobs in their interest areas.
9. if site owner removes a job all funds will be reimbursed
10. we will pay the site owner after the job has expired 
11. if advertiser complains about his job ...
  * I don't know yet what will happen.
12. login will happen via e-mail address, provide your address and we send a link, no passwords to deal with.
  * the link will contain a generated string/id which will be valid for 1 day (until first use) this string will be added to your account and you will be automatically logged-in when the page opens with that string/id
13. recommend to a friend

14. someone is not using our script yet? Use our add job form and include the complete url where you would like to post this job and we will contact the website owner for you. If the owner wants to add the script then your job will be the first he will approve.

## Special Heroku setting

heroku config:add BUILDPACK_URL=git://github.com/bloomtime/heroku-buildpack-nodejs.git#cairo

## Settings

zombie: 2.0.0-alpha8

{
  "Version":"2008-10-17",
  "Statement":[{
    "Sid":"AllowPublicRead",
        "Effect":"Allow",
      "Principal": {
            "AWS": "*"
         },
      "Action":["s3:GetObject"],
      "Resource":["arn:aws:s3:::bucket_name/*"
      ]
    }
  ]
}



