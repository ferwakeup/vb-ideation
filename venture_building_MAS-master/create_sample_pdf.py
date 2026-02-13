"""
Helper script to create a sample PDF from the text file
Run this once to generate the PDF for testing
"""

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
    print("✓ reportlab is installed")
except ImportError:
    print("Installing reportlab...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "reportlab"])
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
    print("✓ reportlab installed successfully")


def create_pdf_from_text(input_file, output_file):
    """Convert text file to PDF"""

    # Read the text file
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Create PDF
    doc = SimpleDocTemplate(
        output_file,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18
    )

    # Container for the 'Flowable' objects
    elements = []

    # Define styles
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor='black',
        spaceAfter=30,
        alignment=TA_CENTER
    )

    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor='black',
        spaceAfter=12,
        spaceBefore=12
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=11,
        alignment=TA_JUSTIFY,
        spaceAfter=12
    )

    # Process content
    lines = content.split('\n')

    for line in lines:
        line = line.strip()

        if not line:
            elements.append(Spacer(1, 0.2*inch))
            continue

        # Check if it's a title (all caps, long enough)
        if line.isupper() and len(line) > 10 and not line.startswith('CAGR'):
            elements.append(Paragraph(line, heading_style))

        # Regular paragraph
        else:
            elements.append(Paragraph(line, body_style))

    # Build PDF
    doc.build(elements)
    print(f"✓ PDF created successfully: {output_file}")


if __name__ == "__main__":
    input_txt = "data/sample_mobility_report.txt"
    output_pdf = "data/sample_mobility_report.pdf"

    print("Creating sample PDF...")
    create_pdf_from_text(input_txt, output_pdf)
    print("\n✓ Sample PDF ready for testing!")
    print(f"\nYou can now run the Jupyter notebook and it will use: {output_pdf}")
