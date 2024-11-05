// Previous code remains the same until the availability check...

export async function POST(request: Request) {
  try {
    // ... previous validation code ...

    const eventType = EVENT_TYPES[eventTypeCode];
    if (!eventType) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }

    // Force anesthesiologist requirement for all surgical procedures
    const requiresAnesthesiologist = eventType.category === 'SURGICAL' || eventType.requiresAnesthesiologist;

    // ... surgeon availability check ...

    // Check anesthesiologist availability for all surgical procedures
    if (requiresAnesthesiologist) {
      const { data: anesthesiologists, error: anesthError } = await supabaseAdmin
        .from('doctors')
        .select('*')
        .eq('role', 'ANESTHESIOLOGIST')
        .eq('defaultLocation', location)
        .eq('active', true);

      if (anesthError || !anesthesiologists?.length) {
        return NextResponse.json(
          { 
            available: false, 
            reason: 'No anesthesiologists found for this location. Surgical procedures require an anesthesiologist.' 
          },
          { status: 200 }
        );
      }

      const anesthesiologistService = new AnesthesiologistService();
      const availableAnesthesiologist = await anesthesiologistService.findAvailableAnesthesiologist(
        accessToken,
        startTime,
        duration,
        location,
        anesthesiologists
      );

      if (!availableAnesthesiologist) {
        return NextResponse.json(
          { 
            available: false, 
            reason: 'No anesthesiologist available. Surgical procedures require an anesthesiologist.' 
          },
          { status: 200 }
        );
      }

      return NextResponse.json({
        available: true,
        anesthesiologist: {
          id: availableAnesthesiologist.id,
          name: availableAnesthesiologist.name
        }
      });
    }

    return NextResponse.json({ available: true });
  } catch (error: any) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}