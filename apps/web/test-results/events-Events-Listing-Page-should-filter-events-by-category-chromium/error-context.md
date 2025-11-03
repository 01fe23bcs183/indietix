# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "Discover Events" [level=1] [ref=e4]
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: City
        - combobox [ref=e8]:
          - option "All Cities" [selected]
          - option "Bengaluru"
          - option "Mumbai"
          - option "Delhi"
      - generic [ref=e9]:
        - generic [ref=e10]: Category
        - combobox [ref=e11]:
          - option "All Categories" [selected]
          - option "Music"
          - option "Comedy"
          - option "Sports"
          - option "Tech"
          - option "Food"
          - option "Art"
          - option "Workshop"
      - generic [ref=e12]:
        - generic [ref=e13]: Max Price
        - spinbutton [ref=e14]
      - generic [ref=e15]:
        - generic [ref=e16]: From Date
        - textbox [ref=e17]
      - generic [ref=e18]:
        - generic [ref=e19]: To Date
        - textbox [ref=e20]
    - paragraph [ref=e22]: No events found
  - alert [ref=e23]
```