import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { parseImages } from '../utils/imageUtils';

// Create a custom modern drop-pin icon using Bootstrap Icons
const createCustomIcon = (type) => {
    return L.divIcon({
        className: 'custom-pin-icon',
        html: `
            <div style="font-size: 28px; font-weight: bold; color: ${type === 'Recommended' ? '#F59E0B' : '#4F46E5'}; transform: translate(-50%, -100%); filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.3)); cursor: pointer;">
                O
            </div>
        `,
        iconSize: [28, 28]
    });
};

// Create a special user icon (You are here)
const createUserIcon = () => {
    return L.divIcon({
        className: 'user-pin-icon',
        html: `
            <div style="font-size: 32px; font-weight: bold; color: #10B981; transform: translate(-50%, -100%); filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.5));">
                X
            </div>
        `,
        iconSize: [32, 32]
    });
};

const getCoordinates = (property) => {
    // Return exact DB coordinates if available
    if (property.latitude && property.longitude) {
        return [parseFloat(property.latitude), parseFloat(property.longitude)];
    }
    // Ultimate Fallback: Default to Pune Center if no exact location saved
    return [18.5204, 73.8567];
};

// Mathematical Distance Curvature Physics
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
};

const MapUpdater = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, 12, { animate: true });
    }, [center, map]);
    return null;
};

const MapComponent = ({ properties, recommendedIds, height = '600px' }) => {
    const [center, setCenter] = useState([18.5204, 73.8567]); // Default Pune
    const [userLoc, setUserLoc] = useState(null);
    const [distanceKm, setDistanceKm] = useState(null);
    const [travelTime, setTravelTime] = useState(null);

    // Auto-center the map based on the first property available
    useEffect(() => {
        if (properties.length > 0) {
            const targetCoords = getCoordinates(properties[0]);
            setCenter(targetCoords);

            // Single-Property Navigation Tracking (Calculate Haversine Distance)
            if (properties.length === 1 && "geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const uLat = pos.coords.latitude;
                        const uLng = pos.coords.longitude;
                        setUserLoc([uLat, uLng]);

                        if (targetCoords) {
                            const dist = calculateDistance(uLat, uLng, targetCoords[0], targetCoords[1]);
                            setDistanceKm(dist);
                            // Estimate travel time: roughly 30 km/h average city speed
                            const timeMins = Math.round((dist / 30) * 60);
                            setTravelTime(timeMins);
                        }
                    },
                    (err) => console.warn("Location error:", err)
                );
            }
        }
    }, [properties]);

    return (
        <div className="w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white relative z-0" style={{ height }}>
            {distanceKm && (
                <div className="absolute top-4 right-4 z-[9999] bg-white/95 backdrop-blur-sm px-4 py-3 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center">
                        Distance
                    </span>
                    <span className="text-xl font-black text-emerald-600 mb-1">
                        {distanceKm} <span className="text-xs text-gray-500 font-medium">km</span>
                    </span>
                    {travelTime && (
                        <span className="text-xs font-bold text-gray-400">
                            ~{travelTime} min drive
                        </span>
                    )}
                </div>
            )}
            <style>
                {`
                    .leaflet-container { z-index: 1 !important; }
                    .custom-popup .leaflet-popup-content-wrapper { border-radius: 1rem; padding: 0; overflow: hidden; }
                    .custom-popup .leaflet-popup-content { margin: 0; width: 220px !important; }
                `}
            </style>
            <MapContainer center={center} zoom={13} className="w-full h-full">
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                <MapUpdater center={center} />

                {userLoc && properties.length === 1 && (
                    <>
                        <Marker position={userLoc} icon={createUserIcon()}>
                            <Popup className="custom-popup" closeButton={false}>
                                <div className="p-3 text-center bg-gray-900 w-full mb-m1">
                                    <h4 className="font-bold text-white text-sm m-0">👤 You are here</h4>
                                    <p className="text-gray-400 text-[10px] mt-1">Live tracking active</p>
                                </div>
                            </Popup>
                        </Marker>
                        <Polyline
                            positions={[userLoc, getCoordinates(properties[0])]}
                            color="#3B82F6"
                            weight={4}
                            dashArray="10, 10"
                            opacity={0.7}
                        />
                    </>
                )}

                {properties.map(property => {
                    const coords = getCoordinates(property);
                    if (!coords) return null;

                    const isRecommended = recommendedIds && recommendedIds.includes(property.id);
                    const icon = createCustomIcon(isRecommended ? 'Recommended' : 'Normal');

                    return (
                        <Marker key={property.id} position={coords} icon={icon}>
                            <Popup className="custom-popup">
                                <div className="flex flex-col bg-white">
                                    <div className="relative h-32 w-full">
                                        {(() => {
                                            const imgs = parseImages(property.images);
                                            return imgs.length > 0 ? (
                                                <img
                                                    src={`http://localhost:5000/${imgs[0]}`}
                                                    alt={property.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">No Image</div>
                                            );
                                        })()}
                                        {isRecommended && (
                                            <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded shadow">
                                                ★ Top Match
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h4 className="font-bold text-gray-900 text-sm mb-1 truncate">{property.title}</h4>
                                        <p className="text-purple-700 font-extrabold text-base mb-2">${property.rent}<span className="text-xs font-normal text-gray-500">/mo</span></p>

                                        <div className="flex items-center text-xs text-gray-500 mb-3">
                                            <span className="flex items-center text-yellow-500 font-bold mr-3">
                                                ★ {parseFloat(property.average_rating || 0).toFixed(1)}
                                            </span>
                                            <span className="truncate" title={property.location}>{property.location}</span>
                                        </div>

                                        <div className="flex gap-2">
                                            <Link
                                                to={`/properties/${property.id}`}
                                                className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white text-center text-[10px] font-bold py-2 rounded transition-colors flex items-center justify-center"
                                            >
                                                Details
                                            </Link>
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-1/2 bg-green-600 hover:bg-green-700 text-white text-center text-[10px] font-bold py-2 rounded transition-colors flex items-center justify-center"
                                            >
                                                Route
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Massive Start Navigation Action Button */}
            {userLoc && properties.length === 1 && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[9999] w-11/12 max-w-sm animate-fade-in-up">
                    <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${userLoc[0]},${userLoc[1]}&destination=${getCoordinates(properties[0])[0]},${getCoordinates(properties[0])[1]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-gray-900 hover:bg-black text-white shadow-2xl text-center font-black text-base py-4 rounded-2xl flex items-center justify-center transition-all hover:scale-105 border-4 border-white"
                    >
                        Start Navigation
                    </a>
                </div>
            )}
        </div>
    );
};

export default MapComponent;
