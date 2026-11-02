export class ApiError extends Error {
  constructor(message, status, code, field) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз', 0, 'NETWORK');
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? 'Не удалось выполнить запрос', res.status, data?.code, data?.field);
  }
  return data;
}

const q = encodeURIComponent;

export const api = {
  config: () => request('/config'),
  services: () => request('/services'),
  slots: (date, serviceId) => request(`/slots?date=${q(date)}&serviceId=${q(serviceId)}`),
  nextFree: (serviceId) => request(`/next-free?serviceId=${q(serviceId)}`),
  createBooking: (payload) => request('/bookings', { method: 'POST', body: payload }),
  listBookings: (date, token) => request(`/bookings?date=${q(date)}`, { token }),
  cancelBooking: (id, token) => request(`/bookings/${q(id)}`, { method: 'DELETE', token }),
};
