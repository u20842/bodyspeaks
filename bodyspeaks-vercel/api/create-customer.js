// api/create-customer.js
// Vercel serverless function — Square token never exposed to browser

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstName, email, dominantPattern, patternName, conditions, counts } = req.body;

  if (!firstName || !email) {
    return res.status(400).json({ error: 'Name and email required' });
  }

  const SQUARE_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
  const LOCATION_ID  = process.env.SQUARE_LOCATION_ID;

  if (!SQUARE_TOKEN || !LOCATION_ID) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Build a note summarizing their PAST results
  const note = [
    `ICU-1111 Body Speaks Assessment`,
    `Dominant Pattern: ${patternName} (${dominantPattern})`,
    `P=${counts.P} A=${counts.A} S=${counts.S} T=${counts.T}`,
    `Conditions: ${conditions.slice(0, 10).join(', ')}${conditions.length > 10 ? ` +${conditions.length - 10} more` : ''}`,
    `Source: bodyspeaks.icu-1111.com`
  ].join(' | ');

  try {
    // Step 1: Create or find customer
    const createRes = await fetch('https://connect.squareup.com/v2/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SQUARE_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18'
      },
      body: JSON.stringify({
        given_name: firstName,
        email_address: email,
        note: note,
        reference_id: `bodyspeaks-${Date.now()}`,
        source_details: { source_name: 'Body Speaks Tool' }
      })
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      // If duplicate email, search for existing customer
      if (createData.errors?.[0]?.code === 'EMAIL_ADDRESS_IN_USE') {
        const searchRes = await fetch('https://connect.squareup.com/v2/customers/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SQUARE_TOKEN}`,
            'Content-Type': 'application/json',
            'Square-Version': '2024-01-18'
          },
          body: JSON.stringify({
            query: { filter: { email_address: { exact: email } } }
          })
        });
        const searchData = await searchRes.json();
        const existingId = searchData.customers?.[0]?.id;

        if (existingId) {
          // Update their note with new assessment
          await fetch(`https://connect.squareup.com/v2/customers/${existingId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${SQUARE_TOKEN}`,
              'Content-Type': 'application/json',
              'Square-Version': '2024-01-18'
            },
            body: JSON.stringify({ note })
          });
        }
        return res.status(200).json({ success: true, existing: true });
      }
      return res.status(400).json({ error: 'Square error', details: createData.errors });
    }

    const customerId = createData.customer?.id;

    // Step 2: Add to ICU-1111 group
    // First get or create the group
    const groupsRes = await fetch('https://connect.squareup.com/v2/customers/groups', {
      headers: {
        'Authorization': `Bearer ${SQUARE_TOKEN}`,
        'Square-Version': '2024-01-18'
      }
    });
    const groupsData = await groupsRes.json();
    let groupId = groupsData.groups?.find(g => g.name === 'ICU-1111')?.id;

    if (!groupId) {
      // Create the group
      const newGroupRes = await fetch('https://connect.squareup.com/v2/customers/groups', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SQUARE_TOKEN}`,
          'Content-Type': 'application/json',
          'Square-Version': '2024-01-18'
        },
        body: JSON.stringify({ group: { name: 'ICU-1111' } })
      });
      const newGroupData = await newGroupRes.json();
      groupId = newGroupData.group?.id;
    }

    // Step 3: Add customer to ICU-1111 group
    if (groupId && customerId) {
      await fetch(`https://connect.squareup.com/v2/customers/${customerId}/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${SQUARE_TOKEN}`,
          'Square-Version': '2024-01-18'
        }
      });
    }

    return res.status(200).json({ success: true, customerId });

  } catch (err) {
    console.error('Square API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
