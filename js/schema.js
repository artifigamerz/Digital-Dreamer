/**
 * Ninety Seven Salon — JSON-LD Structured Data Schema Injector
 * LocalBusiness, HairSalon, AggregateRating & Service schemas
 */

import { SALON_DATA } from './salonData.js';

export function injectJsonLdSchemas() {
  const salonSchema = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    "@id": "https://ninetysevensalon.com/#salon",
    "name": SALON_DATA.info.name,
    "image": [
      "https://ninetysevensalon.com/images/hero-editorial.jpg",
      "https://ninetysevensalon.com/images/space-arch.jpg"
    ],
    "telephone": "+13162855928",
    "email": SALON_DATA.info.email,
    "url": "https://ninetysevensalon.com",
    "priceRange": "$$$",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": SALON_DATA.info.address.street,
      "addressLocality": SALON_DATA.info.address.city,
      "addressRegion": SALON_DATA.info.address.state,
      "postalCode": SALON_DATA.info.address.zip,
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 37.68656,
      "longitude": -97.29124
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Tuesday", "Friday", "Saturday"],
        "opens": "10:00",
        "closes": "18:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Wednesday", "Thursday"],
        "opens": "10:00",
        "closes": "20:30"
      }
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5.0",
      "bestRating": "5",
      "worstRating": "1",
      "reviewCount": "24"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Hair & Beauty Services",
      "itemListElement": SALON_DATA.services.map(s => ({
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": s.name,
          "description": s.description
        },
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": s.startingPrice,
          "priceCurrency": "USD",
          "unitText": "Starting at"
        }
      }))
    }
  };

  const scriptTag = document.createElement('script');
  scriptTag.type = 'application/ld+json';
  scriptTag.textContent = JSON.stringify(salonSchema, null, 2);
  document.head.appendChild(scriptTag);
}
