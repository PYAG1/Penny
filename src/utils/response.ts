export const successResponse = <T>(data: T, message?: string) => {
    return {
        success: true,
        message: message || 'Success',
        data,
    };
};

export const errorResponse = (error: string) => {
    return {
        success: false,
        error,
    };
};

export const paginatedResponse = <T>(
    data: T[],
    page: number,
    limit: number,
    total: number
) => {
    return {
        success: true,
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
